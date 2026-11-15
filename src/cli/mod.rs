mod check;
mod doctor;
mod progress;
mod prompts;
mod stats;
mod update;
mod validate;

use std::io::{IsTerminal, Write};

use crate::app::{App, Env};
use crate::version;

const USAGE: &str = "usage: myleet [command]

  myleet                            open today's session
  myleet open <id>                  open one problem
  myleet check [--solutions] [id]   run tests (attempts, or reference solutions)
  myleet validate                   check the curriculum loads
  myleet validate --lock            record problem ids so a rename cannot orphan saved progress
  myleet doctor                     check python, pytest, editor, data dir
  myleet stats                      print progress stats
  myleet prompts                    download problem statements for offline use
  myleet progress                   edit your save file (progress.toml) in $EDITOR
  myleet update                     pull the latest curriculum (installed content)
  myleet version                    print build version

Install (pick one), then run myleet:

  curl -fsSL https://raw.githubusercontent.com/kidskoding/myleet/master/scripts/install.sh | sh
  nix run github:kidskoding/myleet
  go install github.com/kidskoding/myleet/cmd/myleet@latest   # needs $(go env GOPATH)/bin on PATH";

/// A writer plus whether it may print colors (a terminal with `NO_COLOR` unset).
pub struct Term<W: Write> {
    pub w: W,
    pub color: bool,
}

/// The theme's 16-color palette, so the user's terminal theme decides every color.
#[derive(Clone, Copy)]
pub enum Tone {
    Pass,
    Fail,
    Due,
    Accent,
    Muted,
    Title,
}

impl<W: Write> Term<W> {
    pub fn new(w: W, color: bool) -> Self {
        Term { w, color }
    }

    pub fn paint(&self, tone: Tone, text: &str) -> String {
        if !self.color {
            return text.to_string();
        }
        let code = match tone {
            Tone::Pass => 32,
            Tone::Fail => 31,
            Tone::Due => 33,
            Tone::Accent => 34,
            Tone::Muted => 90,
            Tone::Title => 1,
        };
        format!("\x1b[{code}m{text}\x1b[0m")
    }

    pub fn line(&mut self, text: &str) {
        let _ = writeln!(self.w, "{text}");
    }

    fn ok_tag(&self) -> String {
        self.paint(Tone::Pass, "ok  ")
    }

    fn fail_tag(&self) -> String {
        self.paint(Tone::Fail, "FAIL")
    }
}

pub fn run<O: Write, E: Write>(args: &[String], out: &mut Term<O>, err: &mut Term<E>) -> u8 {
    run_with(args, out, err, &Env::system())
}

pub fn run_with<O: Write, E: Write>(
    args: &[String],
    out: &mut Term<O>,
    err: &mut Term<E>,
    env: &Env,
) -> u8 {
    let (cmd, rest) = args
        .split_first()
        .map_or(("", &[][..]), |(c, r)| (c.as_str(), r));
    match cmd {
        "version" | "-v" | "--version" => {
            out.line(&version::string());
            return 0;
        }
        "validate" => return validate::run(rest, out, err, env),
        "progress" => return progress::run(out, err, env),
        "update" => return update::run(out, err, env),
        "check" | "doctor" | "stats" | "prompts" | "" | "open" => {}
        "-h" | "--help" | "help" => {
            out.line(USAGE);
            return 0;
        }
        _ => {
            err.line(USAGE);
            return 2;
        }
    }
    let a = match App::load_with(env, &mut err.w) {
        Ok(a) => a,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    };
    match cmd {
        "check" => return check::run(&a, rest, out, err),
        "doctor" => return doctor::run(&a, out, env),
        "stats" => return stats::run(&a, out),
        "prompts" => return prompts::run(&a, out),
        _ => {}
    }
    let mut open_id = None;
    if cmd == "open" {
        let [id] = rest else {
            err.line("usage: myleet open <id>");
            return 2;
        };
        if a.catalog.problem(id).is_none() {
            err.line(&format!("myleet: no problem {id:?}"));
            return 1;
        }
        open_id = Some(id.as_str());
    }
    match launch(a, open_id) {
        Ok(()) => 0,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            1
        }
    }
}

fn launch(a: App, open_id: Option<&str>) -> Result<(), String> {
    if !std::io::stdout().is_terminal() {
        return Err("the trainer needs a terminal".into());
    }
    crate::tui::run(crate::tui::Shared::new(a), open_id).map_err(|e| e.to_string())
}

#[cfg(test)]
pub(crate) fn call_with(
    e: &crate::app::testenv::TestEnv,
    color: bool,
    args: &[&str],
) -> (u8, String) {
    let args: Vec<String> = args.iter().map(|a| a.to_string()).collect();
    let mut out = Term::new(Vec::new(), color);
    let mut err = Term::new(Vec::new(), color);
    let code = e.with(|env| run_with(&args, &mut out, &mut err, env));
    let mut text = String::from_utf8(out.w).unwrap();
    text.push_str(&String::from_utf8(err.w).unwrap());
    (code, text)
}

#[cfg(test)]
pub(crate) fn call(e: &crate::app::testenv::TestEnv, args: &[&str]) -> (u8, String) {
    call_with(e, false, args)
}

/// Mirrors Go's repoPython: points MYLEET_PYTHON at the repo .venv, or `None` to skip.
#[cfg(test)]
pub(crate) fn repo_python(e: &mut crate::app::testenv::TestEnv) -> Option<()> {
    let py = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".venv/bin/python");
    if !py.exists() {
        eprintln!("skipping: repo .venv missing");
        return None;
    }
    e.set("MYLEET_PYTHON", py.to_string_lossy());
    Some(())
}

#[cfg(test)]
mod tests {
    use super::{Term, Tone, call, call_with, repo_python};
    use crate::app::testenv::TestEnv;

    #[test]
    fn version_prints_identity() {
        let e = TestEnv::new("good");
        for flag in ["version", "-v", "--version"] {
            let (code, out) = call(&e, &[flag]);
            assert_eq!(code, 0, "{flag}");
            assert!(out.starts_with("myleet "), "{flag}: {out}");
        }
    }

    #[test]
    fn help_prints_usage() {
        let e = TestEnv::new("good");
        for flag in ["help", "-h", "--help"] {
            let (code, out) = call(&e, &[flag]);
            assert_eq!(code, 0, "{flag}");
            assert!(out.starts_with("usage: myleet"), "{flag}: {out}");
        }
    }

    #[test]
    fn unknown_command() {
        let e = TestEnv::new("good");
        let (code, out) = call(&e, &["frobnicate"]);
        assert_eq!(code, 2);
        assert!(out.contains("usage"), "{out}");
    }

    #[test]
    fn trainer_and_open_need_a_terminal() {
        let e = TestEnv::new("good");
        for args in [&[][..], &["open", "p-one"][..]] {
            let (code, out) = call(&e, args);
            assert_eq!(code, 1, "{args:?}");
            assert!(out.contains("needs a terminal"), "{args:?}: {out}");
        }
    }

    #[test]
    fn open_checks_its_argument() {
        let e = TestEnv::new("good");
        let (code, out) = call(&e, &["open"]);
        assert_eq!(code, 2);
        assert!(out.contains("usage: myleet open <id>"), "{out}");
        let (code, out) = call(&e, &["open", "nope"]);
        assert_eq!(code, 1);
        assert!(out.contains("no problem \"nope\""), "{out}");
    }

    #[test]
    fn load_errors_exit_1() {
        let mut e = TestEnv::new("good");
        e.set("MYLEET_ROOT", "/elsewhere");
        let (code, out) = call(&e, &["stats"]);
        assert_eq!(code, 1);
        assert!(out.contains("myleet: MYLEET_ROOT=/elsewhere"), "{out}");
    }

    #[test]
    fn plain_when_not_a_terminal() {
        let e = TestEnv::new("good");
        let (_, out) = call(&e, &["stats"]);
        assert!(
            !out.contains("\x1b["),
            "piped output must not contain escape codes: {out:?}"
        );
    }

    #[test]
    fn color_on_terminal() {
        let e = TestEnv::new("good");
        let (code, out) = call_with(&e, true, &["validate"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("\x1b[32m"), "ok should be green: {out:?}");
    }

    #[test]
    fn doctor_colors_status() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        let (_, out) = call_with(&e, true, &["doctor"]);
        assert!(
            out.contains("\x1b[32mok"),
            "doctor ok should be green: {out:?}"
        );
    }

    #[test]
    fn colors_only_when_allowed() {
        assert_eq!(Term::new(Vec::new(), false).paint(Tone::Pass, "ok:"), "ok:");
        assert_eq!(
            Term::new(Vec::new(), true).paint(Tone::Pass, "ok:"),
            "\x1b[32mok:\x1b[0m"
        );
    }
}
