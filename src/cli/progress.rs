use std::io::Write;
use std::path::PathBuf;

use jiff::tz::TimeZone;

use super::{Term, Tone};
use crate::app::{App, Env, SAVE_FILE};
use crate::config::{self, Config};
use crate::editor;
use crate::savestate;

pub fn save_file_path(env: &Env) -> Result<(PathBuf, Config), String> {
    let cfg = config::load_with(env.var)?;
    Ok((cfg.state_dir_path_with(env.var).join(SAVE_FILE), cfg))
}

/// Skips loading the app so it still works when the save file is broken.
pub fn run<O: Write, E: Write>(out: &mut Term<O>, err: &mut Term<E>, env: &Env) -> u8 {
    let fail = |err: &mut Term<E>, msg: String| {
        err.line(&format!("myleet: {msg}"));
        1
    };
    let (path, cfg) = match save_file_path(env) {
        Ok(found) => found,
        Err(e) => return fail(err, e),
    };
    if !path.exists() {
        if let Err(e) = App::load_with(env, &mut std::io::sink()) {
            return fail(err, e);
        }
    }
    let before = match std::fs::read(&path) {
        Ok(data) => data,
        Err(e) => return fail(err, e.to_string()),
    };
    let tz = TimeZone::system();
    let before_ok = savestate::read(&path, &tz).is_ok();

    let mut cmd = match editor::command_from(&cfg, &path, env.var) {
        Ok(cmd) => cmd,
        Err(e) => return fail(err, e),
    };
    match cmd.status() {
        Ok(status) if status.success() => {}
        Ok(status) => return fail(err, format!("editor: {status}")),
        Err(e) => return fail(err, format!("editor: {e}")),
    }

    if let Err(e) = savestate::read(&path, &tz) {
        out.line(&format!(
            "{}  {}",
            out.fail_tag(),
            out.paint(Tone::Fail, &e.to_string())
        ));
        if before_ok {
            if let Err(e) = std::fs::write(&path, before) {
                return fail(err, format!("could not restore: {e}"));
            }
            out.line(&out.paint(
                Tone::Due,
                "restored the previous version; run `myleet progress` to try again",
            ));
        } else {
            out.line(&out.paint(
                Tone::Due,
                "the file is still broken; run `myleet progress` to fix it",
            ));
        }
        return 1;
    }
    let shown = out.paint(Tone::Muted, &path.display().to_string());
    out.line(&format!("{}  saved {shown}", out.ok_tag()));
    0
}

#[cfg(test)]
mod tests {
    use crate::app::testenv::TestEnv;
    use crate::cli::call;

    /// A fake $EDITOR that overwrites the file it is given with `content`.
    fn fake_editor(e: &mut TestEnv, dir: &tempfile::TempDir, content: &str) {
        let script = dir.path().join("ed.sh");
        let body = format!("#!/bin/sh\ncat > \"$1\" <<'EOT'\n{content}EOT\n");
        std::fs::write(&script, body).unwrap();
        // Run through sh: exec'ing a just-written script races other tests' forks (ETXTBSY).
        e.set("EDITOR", format!("sh {}", script.display()));
        e.set("VISUAL", "");
    }

    #[test]
    fn progress_accepts_good_edit() {
        let mut e = TestEnv::new("good");
        call(&e, &["stats"]); // creates the save file
        let dir = tempfile::tempdir().unwrap();
        fake_editor(
            &mut e,
            &dir,
            "[p-one]\nrung = \"7d\"\ndue = 2026-11-01\nlast = 2026-10-20\n",
        );
        let (code, out) = call(&e, &["progress"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("saved"), "{out}");
        let (_, out) = call(&e, &["stats"]);
        assert!(out.contains("reviewing 1"), "edit not applied: {out}");
    }

    #[test]
    fn progress_restores_on_bad_edit() {
        let mut e = TestEnv::new("good");
        call(&e, &["stats"]);
        let before = std::fs::read(e.save()).unwrap();
        let dir = tempfile::tempdir().unwrap();
        fake_editor(&mut e, &dir, "[p-one]\nrung = \"9d\"\n");
        let (code, out) = call(&e, &["progress"]);
        assert_eq!(code, 1, "{out}");
        assert!(out.contains("9d") && out.contains("restored"), "{out}");
        assert_eq!(
            std::fs::read(e.save()).unwrap(),
            before,
            "a broken edit must be rolled back"
        );
    }

    #[test]
    fn progress_creates_the_save_file_first() {
        let mut e = TestEnv::new("good");
        let dir = tempfile::tempdir().unwrap();
        fake_editor(&mut e, &dir, "");
        let (code, out) = call(&e, &["progress"]);
        assert_eq!(code, 0, "{out}");
        assert!(e.save().exists());
    }
}
