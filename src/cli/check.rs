use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, PoisonError};

use super::{Term, Tone};
use crate::app::App;
use crate::catalog::Problem;
use crate::runner::{Outcome, RunResult};

const CHECK_WORKERS: usize = 8;
const FLAG_USAGE: &str = "Usage of check:\n  -solutions\n    \trun reference solution.py files";

/// Accepts `-solutions`, `--solutions` and `-solutions=bool`; stops at the first positional or `--`.
fn parse(args: &[String]) -> Result<(bool, Vec<String>), String> {
    let mut solutions = false;
    let mut i = 0;
    while let Some(arg) = args.get(i) {
        if arg == "--" {
            i += 1;
            break;
        }
        if arg == "-" || !arg.starts_with('-') {
            break;
        }
        let name = arg.trim_start_matches('-');
        let (name, value) = name
            .split_once('=')
            .map_or((name, None), |(n, v)| (n, Some(v)));
        match (name, value) {
            ("solutions", None) => solutions = true,
            ("solutions", Some(v)) => {
                solutions = match v {
                    "1" | "t" | "T" | "true" | "TRUE" | "True" => true,
                    "0" | "f" | "F" | "false" | "FALSE" | "False" => false,
                    _ => {
                        return Err(format!(
                            "invalid boolean value {v:?} for -solutions: parse error\n{FLAG_USAGE}"
                        ));
                    }
                }
            }
            ("h" | "help", None) => return Err(FLAG_USAGE.into()),
            _ => {
                return Err(format!(
                    "flag provided but not defined: -{name}\n{FLAG_USAGE}"
                ));
            }
        }
        i += 1;
    }
    Ok((solutions, args[i..].to_vec()))
}

pub fn run<O: Write, E: Write>(
    a: &App,
    args: &[String],
    out: &mut Term<O>,
    err: &mut Term<E>,
) -> u8 {
    let (solutions, rest) = match parse(args) {
        Ok(parsed) => parsed,
        Err(usage) => {
            err.line(&usage);
            return 2;
        }
    };
    if let Some(e) = &a.python_err {
        err.line(&format!("myleet: {e}"));
        return 1;
    }
    let pick = |p: &Problem| -> Option<PathBuf> {
        if solutions {
            return p.has_solution.then(|| p.solution_path());
        }
        let path = a.workspace.attempt_path(&p.id);
        path.exists().then_some(path)
    };
    let mut jobs: Vec<(&Problem, PathBuf)> = Vec::new();
    match rest.first().filter(|id| !id.is_empty()) {
        Some(id) => {
            let Some(p) = a.catalog.problem(id) else {
                err.line(&format!("myleet: no problem {id:?}"));
                return 1;
            };
            let Some(code) = pick(p) else {
                let what = if solutions {
                    "no solution.py".to_string()
                } else {
                    format!("no attempt yet (open it with `myleet open {id}`)")
                };
                err.line(&format!("myleet: {id}: {what}"));
                return 1;
            };
            jobs.push((p, code));
        }
        None => jobs.extend(
            a.catalog
                .problems()
                .iter()
                .filter_map(|p| pick(p).map(|code| (p, code))),
        ),
    }

    let results: Vec<Mutex<RunResult>> = jobs.iter().map(|_| Mutex::default()).collect();
    let next = AtomicUsize::new(0);
    std::thread::scope(|s| {
        for _ in 0..CHECK_WORKERS.min(jobs.len()) {
            s.spawn(|| {
                loop {
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    let Some((p, code)) = jobs.get(i) else { break };
                    let res = a.runner.run(&p.test_path(), code);
                    *results[i].lock().unwrap_or_else(PoisonError::into_inner) = res;
                }
            });
        }
    });

    let mut failed = 0;
    for ((p, _), res) in jobs.iter().zip(results) {
        let res = res.into_inner().unwrap_or_else(PoisonError::into_inner);
        if res.green() {
            let count = out.paint(Tone::Muted, &format!("{}/{}", res.passed, res.total));
            out.line(&format!("{}  {:<40} {count}", out.ok_tag(), p.id));
            continue;
        }
        failed += 1;
        let why = out.paint(Tone::Fail, &failure_line(&res));
        out.line(&format!(
            "{}  {:<40} {}/{}  {why}",
            out.fail_tag(),
            p.id,
            res.passed,
            res.total
        ));
    }
    let mut summary = out.paint(Tone::Pass, &format!("{} passed", jobs.len() - failed)) + ", ";
    summary += &if failed > 0 {
        out.paint(Tone::Fail, &format!("{failed} failed"))
    } else {
        out.paint(Tone::Muted, "0 failed")
    };
    out.line(&summary);
    u8::from(failed > 0)
}

fn failure_line(res: &RunResult) -> String {
    if let Some(e) = &res.err {
        return e.clone();
    }
    if res.timed_out {
        return "timed out".into();
    }
    if res.not_started {
        return "not started".into();
    }
    res.tests
        .iter()
        .find(|t| t.outcome != Outcome::Passed)
        .map_or_else(
            || "no tests ran".into(),
            |t| format!("{}: {}", t.name, t.message),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::testenv::TestEnv;
    use crate::cli::{call, repo_python};

    fn args(a: &[&str]) -> Vec<String> {
        a.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn check_solutions() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        let (code, out) = call(&e, &["check", "--solutions"]);
        assert_eq!(code, 0, "{out}");
        assert!(
            out.contains("p-one") && out.contains("2 passed, 0 failed"),
            "{out}"
        );
    }

    #[test]
    fn check_attempt_missing() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        let (code, out) = call(&e, &["check", "p-two"]);
        assert_eq!(code, 1);
        assert!(out.contains("no attempt"), "{out}");
    }

    #[test]
    fn flags_parse_like_go() {
        assert_eq!(
            parse(&args(&["--solutions", "p-one"])).unwrap(),
            (true, args(&["p-one"]))
        );
        assert_eq!(
            parse(&args(&["-solutions=false"])).unwrap(),
            (false, vec![])
        );
        assert_eq!(
            parse(&args(&["p-one", "-solutions"])).unwrap(),
            (false, args(&["p-one", "-solutions"]))
        );
        assert!(
            parse(&args(&["-x"]))
                .unwrap_err()
                .contains("not defined: -x")
        );
    }
}
