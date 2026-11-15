use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use jiff::Timestamp;

use crate::catalog::Problem;

const STAMP_FORMAT: &str = "%Y%m%dT%H%M%SZ";

#[derive(Debug, Clone)]
pub struct Workspace {
    pub dir: PathBuf,
}

impl Workspace {
    pub fn attempt_path(&self, id: &str) -> PathBuf {
        self.dir.join("workspace").join(id).join("attempt.py")
    }

    fn snapshot_dir(&self, id: &str) -> PathBuf {
        self.dir.join("snapshots").join(id)
    }

    pub fn ensure(&self, p: &Problem) -> io::Result<PathBuf> {
        let path = self.attempt_path(&p.id);
        match fs::metadata(&path) {
            Ok(_) => return Ok(path),
            Err(e) if e.kind() != io::ErrorKind::NotFound => return Err(e),
            Err(_) => {}
        }
        copy_starter(p, &path)?;
        Ok(path)
    }

    /// Returns `None` when the attempt matches the latest snapshot.
    pub fn snapshot(&self, id: &str, now: Timestamp) -> io::Result<Option<PathBuf>> {
        let data = fs::read(self.attempt_path(id))?;
        let snaps = self.snapshots(id)?;
        if snaps
            .last()
            .is_some_and(|last| fs::read(last).is_ok_and(|latest| latest == data))
        {
            return Ok(None);
        }
        let dir = self.snapshot_dir(id);
        fs::create_dir_all(&dir)?;
        let path = dir.join(format!("{}.py", now.strftime(STAMP_FORMAT)));
        fs::write(&path, data)?;
        Ok(Some(path))
    }

    pub fn snapshots(&self, id: &str) -> io::Result<Vec<PathBuf>> {
        let entries = match fs::read_dir(self.snapshot_dir(id)) {
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
            other => other?,
        };
        let mut paths = Vec::new();
        for entry in entries {
            let path = entry?.path();
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.ends_with(".py"))
            {
                paths.push(path);
            }
        }
        paths.sort();
        Ok(paths)
    }

    pub fn reset(&self, p: &Problem) -> io::Result<()> {
        copy_starter(p, &self.attempt_path(&p.id))
    }

    /// Removes all attempt files and snapshots (keeps prompts cache elsewhere).
    pub fn clear_attempts(&self) -> io::Result<()> {
        for name in ["workspace", "snapshots"] {
            match fs::remove_dir_all(self.dir.join(name)) {
                Err(e) if e.kind() != io::ErrorKind::NotFound => return Err(e),
                _ => {}
            }
        }
        Ok(())
    }
}

fn copy_starter(p: &Problem, path: &Path) -> io::Result<()> {
    let data = fs::read(p.starter_path())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, data)
}

pub fn diff(old_path: &Path, new_path: &Path) -> io::Result<String> {
    let before = fs::read_to_string(old_path)?;
    let after = fs::read_to_string(new_path)?;
    let name = old_path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(similar::TextDiff::from_lines(&before, &after)
        .unified_diff()
        .header(&name, "current")
        .to_string())
}

#[cfg(test)]
pub(crate) fn test_problem(id: &str, dir: &Path) -> Problem {
    Problem {
        id: id.to_string(),
        title: String::new(),
        url: String::new(),
        key_idea: String::new(),
        prompt: String::new(),
        dir: dir.to_path_buf(),
        difficulty: crate::catalog::Difficulty::Easy,
        leetcode: 0,
        hints: Vec::new(),
        say_aloud: Vec::new(),
        time_target: std::time::Duration::ZERO,
        number: 0,
        order: 0,
        module: 0,
        technique: 0,
        has_solution: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    const STARTER: &str = "def f():\n    raise NotImplementedError\n";

    fn setup() -> (Workspace, Problem, TempDir, TempDir) {
        let pdir = tempfile::tempdir().unwrap();
        fs::write(pdir.path().join("starter.py"), STARTER).unwrap();
        let wdir = tempfile::tempdir().unwrap();
        let p = test_problem("p", pdir.path());
        (
            Workspace {
                dir: wdir.path().to_path_buf(),
            },
            p,
            pdir,
            wdir,
        )
    }

    fn read(path: &Path) -> String {
        fs::read_to_string(path).unwrap()
    }

    fn ts(s: &str) -> Timestamp {
        s.parse().unwrap()
    }

    #[test]
    fn ensure_copies_starter_once() {
        let (w, p, _a, _b) = setup();
        let path = w.ensure(&p).unwrap();
        assert_eq!(path, w.attempt_path("p"));
        assert_eq!(read(&path), STARTER);
        assert!(path.ends_with(Path::new("workspace/p/attempt.py")));
        fs::write(&path, "edited\n").unwrap();
        w.ensure(&p).unwrap();
        assert_eq!(read(&path), "edited\n", "edit lost");
    }

    #[test]
    fn ensure_recreates_deleted() {
        let (w, p, _a, _b) = setup();
        let path = w.ensure(&p).unwrap();
        fs::remove_file(&path).unwrap();
        w.ensure(&p).unwrap();
        assert_eq!(read(&path), STARTER);
    }

    #[test]
    fn snapshot_dedup() {
        let (w, p, _a, _b) = setup();
        let path = w.ensure(&p).unwrap();
        fs::write(&path, "v1\n").unwrap();
        let snap = w
            .snapshot("p", ts("2026-10-19T15:04:05Z"))
            .unwrap()
            .unwrap();
        assert_eq!(snap.file_name().unwrap(), "20261019T150405Z.py");
        assert_eq!(read(&snap), "v1\n");
        assert!(snap.parent().unwrap().ends_with(Path::new("snapshots/p")));
        assert_eq!(w.snapshot("p", ts("2026-10-19T15:05:05Z")).unwrap(), None);
        fs::write(&path, "v2\n").unwrap();
        w.snapshot("p", ts("2026-10-19T15:06:05Z")).unwrap();
        let snaps = w.snapshots("p").unwrap();
        assert_eq!(snaps.len(), 2);
        assert_eq!(snaps[1].file_name().unwrap(), "20261019T150605Z.py");
    }

    #[test]
    fn snapshot_stamp_is_utc() {
        let (w, p, _a, _b) = setup();
        w.ensure(&p).unwrap();
        let snap = w
            .snapshot("p", ts("2026-10-19T10:04:05-05:00"))
            .unwrap()
            .unwrap();
        assert_eq!(snap.file_name().unwrap(), "20261019T150405Z.py");
    }

    #[test]
    fn snapshots_none_yet() {
        let (w, _p, _a, _b) = setup();
        assert!(w.snapshots("p").unwrap().is_empty());
    }

    #[test]
    fn reset_keeps_snapshots() {
        let (w, p, _a, _b) = setup();
        let path = w.ensure(&p).unwrap();
        fs::write(&path, "solved\n").unwrap();
        w.snapshot("p", Timestamp::now()).unwrap();
        w.reset(&p).unwrap();
        assert_eq!(read(&path), STARTER);
        assert_eq!(w.snapshots("p").unwrap().len(), 1);
    }

    #[test]
    fn clear_attempts_removes_both() {
        let (w, p, _a, _b) = setup();
        w.ensure(&p).unwrap();
        w.snapshot("p", Timestamp::now()).unwrap();
        w.clear_attempts().unwrap();
        assert!(!w.attempt_path("p").exists());
        assert!(w.snapshots("p").unwrap().is_empty());
        w.clear_attempts().unwrap();
    }

    #[test]
    fn diff_shows_changes() {
        let dir = tempfile::tempdir().unwrap();
        let (a, b) = (dir.path().join("a.py"), dir.path().join("b.py"));
        fs::write(&a, "same\nold line\n").unwrap();
        fs::write(&b, "same\nnew line\n").unwrap();
        let d = diff(&a, &b).unwrap();
        assert!(d.contains("-old line") && d.contains("+new line"), "{d}");
        assert!(d.starts_with("--- a.py\n+++ current\n"), "{d}");
    }
}
