use std::io::Write;
use std::path::Path;

use super::{Term, Tone};
use crate::catalog::{self, LOCK_FILE};

pub fn run<O: Write, E: Write>(args: &[String], out: &mut Term<O>, err: &mut Term<E>) -> u8 {
    let cwd = std::env::current_dir().unwrap_or_default();
    let root = match catalog::find_root(&cwd) {
        Ok(root) => root,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    };
    validate(&root, args.iter().any(|a| a == "--lock"), out, err)
}

fn validate<O: Write, E: Write>(
    root: &Path,
    lock: bool,
    out: &mut Term<O>,
    err: &mut Term<E>,
) -> u8 {
    let c = match catalog::load(root) {
        Ok(c) => c,
        Err(e) => {
            err.line(&err.paint(Tone::Fail, &e.to_string()));
            return 1;
        }
    };
    let ids = c.ids();
    if lock {
        if let Err(e) = catalog::write_lock(root, &ids) {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    }
    let locked = match catalog::read_lock(root) {
        Ok(locked) => locked,
        Err(e) => {
            err.line(&format!("myleet: {e}"));
            return 1;
        }
    };
    let missing: Vec<&str> = locked
        .iter()
        .flatten()
        .filter(|id| c.problem(id).is_none())
        .map(String::as_str)
        .collect();
    if !missing.is_empty() {
        let msg = format!(
            "{} locked problem ids are gone: {}",
            missing.len(),
            missing.join(", ")
        );
        err.line(&err.paint(Tone::Fail, &msg));
        err.line("saved progress is keyed by id, so learners would lose it. Restore the ids, or run `myleet validate --lock` if the removal is deliberate.");
        return 1;
    }
    let curriculum = c.curriculum().count();
    out.line(&format!(
        "{} {curriculum} curriculum problems, {} playlist-only, {} playlists",
        out.paint(Tone::Pass, "ok:"),
        ids.len() - curriculum,
        c.playlists.len()
    ));
    if let Some(locked) = locked {
        let fresh = ids.len().saturating_sub(locked.len());
        if fresh > 0 {
            out.line(&format!(
                "{} {fresh} new problem ids are not in {LOCK_FILE} yet; run `myleet validate --lock`",
                out.paint(Tone::Due, "note:")
            ));
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::testdata;
    use std::fs;

    const GOOD_IDS: [&str; 5] = [
        "logger-rate-limiter",
        "p-one",
        "p-three",
        "p-two",
        "two-sum",
    ];

    fn copy_dir(src: &Path, dst: &Path) {
        fs::create_dir_all(dst).unwrap();
        for entry in fs::read_dir(src).unwrap() {
            let entry = entry.unwrap();
            let to = dst.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() {
                copy_dir(&entry.path(), &to);
            } else {
                fs::copy(entry.path(), to).unwrap();
            }
        }
    }

    /// A temp copy of a fixture tree, so lock writes never touch the fixtures.
    fn fixture(name: &str) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        copy_dir(&testdata(name), dir.path());
        dir
    }

    fn check(root: &Path, lock: bool) -> (u8, String) {
        let mut out = Term::new(Vec::new(), false);
        let mut err = Term::new(Vec::new(), false);
        let code = validate(root, lock, &mut out, &mut err);
        (
            code,
            String::from_utf8(out.w).unwrap() + &String::from_utf8(err.w).unwrap(),
        )
    }

    fn write_lock(root: &Path, ids: &[&str]) {
        fs::write(root.join(LOCK_FILE), ids.join("\n") + "\n").unwrap();
    }

    #[test]
    fn good_passes_with_counts() {
        let root = fixture("good");
        let (code, out) = check(root.path(), false);
        assert_eq!(code, 0, "{out}");
        assert!(
            out.contains("ok: 4 curriculum problems, 1 playlist-only, 2 playlists"),
            "{out}"
        );
    }

    #[test]
    fn bad_fails_with_every_error() {
        let root = fixture("bad");
        let (code, out) = check(root.path(), false);
        assert_eq!(code, 1);
        assert!(out.contains("duplicate id"), "{out}");
    }

    #[test]
    fn locked_id_that_disappears_fails() {
        let root = fixture("good");
        let mut ids = GOOD_IDS.to_vec();
        ids.push("gone-problem");
        write_lock(root.path(), &ids);
        let (code, out) = check(root.path(), false);
        assert_eq!(code, 1);
        assert!(
            out.contains("gone-problem") && out.contains("progress"),
            "{out}"
        );
    }

    #[test]
    fn lock_records_every_id() {
        let root = fixture("good");
        write_lock(root.path(), &["p-one"]);
        let (code, out) = check(root.path(), true);
        assert_eq!(code, 0, "{out}");
        let lock = fs::read_to_string(root.path().join(LOCK_FILE)).unwrap();
        assert_eq!(lock.split_whitespace().collect::<Vec<_>>(), GOOD_IDS);
    }

    #[test]
    fn unlocked_ids_pass_with_a_reminder() {
        let root = fixture("good");
        write_lock(root.path(), &["p-one"]);
        let (code, out) = check(root.path(), false);
        assert_eq!(code, 0, "{out}");
        assert!(
            out.contains("4 new problem ids") && out.contains("--lock"),
            "{out}"
        );
    }

    #[test]
    fn no_lock_file_means_no_reminder() {
        let root = fixture("good");
        let (_, out) = check(root.path(), false);
        assert!(!out.contains("note:"), "{out}");
    }
}
