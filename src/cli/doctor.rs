use std::io::Write;
use std::path::Path;
use std::process::Command;

use super::progress::save_file_path;
use super::{Term, Tone};
use crate::app::{App, Env};
use crate::catalog;
use crate::editor;
use crate::runner::look_path;
use crate::version;

pub fn run<O: Write>(a: &App, out: &mut Term<O>, env: &Env) -> u8 {
    let mut failed = 0;
    let mut report = |out: &mut Term<O>, ok: bool, what: &str, detail: &str, fix: &str| {
        if ok {
            let detail = out.paint(Tone::Muted, detail);
            out.line(&format!("{}  {what:<8} {detail}", out.ok_tag()));
            return;
        }
        failed += 1;
        let fix = out.paint(Tone::Due, &format!("fix: {fix}"));
        out.line(&format!(
            "{}  {what:<8} {detail}\n      {fix}",
            out.fail_tag()
        ));
    };

    out.line(&version::string());
    let data = env.data_dir();
    let kind = catalog::root_kind_with(&a.root, &data, env.get("MYLEET_ROOT"));
    let root = format!("{} ({kind})", a.root.display());
    report(out, true, "root", &root, "");
    let python = a.runner.python.join(" ");
    let install = "install uv, then re-run myleet";
    report(out, a.python_err.is_none(), "python", &python, install);
    if let (None, Some((bin, py_args))) = (&a.python_err, a.runner.python.split_first()) {
        let (ok, detail) = match Command::new(bin)
            .args(py_args)
            .args(["-m", "pytest", "--version"])
            .output()
        {
            Ok(o) => {
                let mut text = String::from_utf8_lossy(&o.stdout).into_owned();
                text.push_str(&String::from_utf8_lossy(&o.stderr));
                (o.status.success(), text.trim().to_string())
            }
            Err(e) => (false, e.to_string()),
        };
        report(out, ok, "pytest", &detail, install);
    }
    match editor::command_from(&a.config, Path::new("file.py"), env.var) {
        Ok(cmd) => {
            let program = cmd.get_program().to_string_lossy().into_owned();
            report(out, true, "editor", &resolve(&program, env), "");
        }
        Err(e) => report(out, false, "editor", &e, "export EDITOR=nvim"),
    }
    let probe = data.join(".doctor");
    let writable = std::fs::create_dir_all(&data).and_then(|()| std::fs::write(&probe, "ok"));
    let _ = std::fs::remove_file(&probe);
    let shown = data.display().to_string();
    report(
        out,
        writable.is_ok(),
        "data",
        &shown,
        &format!("make {shown} writable"),
    );
    if let Ok((save, _)) = save_file_path(env) {
        report(out, true, "save", &save.display().to_string(), "");
    }
    let mut orphaned: Vec<&str> = a
        .states()
        .keys()
        .filter(|id| a.catalog.problem(id).is_none())
        .map(String::as_str)
        .collect();
    orphaned.sort_unstable();
    if !orphaned.is_empty() {
        let detail = format!(
            "saved progress for {} problems no longer in the catalog: {}",
            orphaned.len(),
            orphaned.join(", ")
        );
        let fix =
            "restore those problem ids in the repo, or delete their blocks with `myleet progress`";
        report(out, false, "progress", &detail, fix);
    }
    u8::from(failed > 0)
}

fn resolve(program: &str, env: &Env) -> String {
    if program.contains(std::path::MAIN_SEPARATOR) {
        return program.to_string();
    }
    look_path(program, &(env.var)("PATH").unwrap_or_default())
        .map_or_else(|| program.to_string(), |p| p.display().to_string())
}

#[cfg(test)]
mod tests {
    use crate::app::testenv::TestEnv;
    use crate::cli::{call, repo_python};

    #[test]
    fn doctor_shows_save_file() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        let (_, out) = call(&e, &["doctor"]);
        assert!(
            out.contains("progress.toml"),
            "doctor should print the save file path: {out}"
        );
    }

    #[test]
    fn doctor_flags_orphaned_progress() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        std::fs::create_dir_all(e.state()).unwrap();
        let save = "[\"gone-problem\"]\nrung = \"3d\"\nlast = 2026-10-18\n";
        std::fs::write(e.save(), save).unwrap();
        let (code, out) = call(&e, &["doctor"]);
        assert_eq!(code, 1, "{out}");
        assert!(out.contains("gone-problem"), "{out}");
    }

    #[test]
    fn doctor_reports_missing_editor() {
        let mut e = TestEnv::new("good");
        if repo_python(&mut e).is_none() {
            return;
        }
        let empty = tempfile::tempdir().unwrap();
        e.set("PATH", empty.path().to_string_lossy());
        let (code, out) = call(&e, &["doctor"]);
        assert_eq!(code, 1, "{out}");
        assert!(out.contains("fix: export EDITOR=nvim"), "{out}");
    }
}
