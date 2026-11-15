//! The event log file; the event model and line format live in `myleet_core::progress`.

use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};

pub use myleet_core::progress::*;

pub struct Log {
    path: PathBuf,
}

impl Log {
    /// Unreadable lines become warnings so one corrupt line cannot lock the learner out
    /// of their history.
    pub fn open(path: &Path) -> (Log, Vec<Event>, Vec<String>) {
        let log = Log {
            path: path.to_path_buf(),
        };
        let text = match fs::read_to_string(path) {
            Ok(text) => text,
            Err(e) if e.kind() == ErrorKind::NotFound => return (log, Vec::new(), Vec::new()),
            Err(e) => return (log, Vec::new(), vec![e.to_string()]),
        };
        let (events, warns) = parse_lines(&text, &path.display().to_string());
        (log, events, warns)
    }

    pub fn append(&self, e: &Event) -> std::io::Result<()> {
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir)?;
        }
        let mut f = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        f.write_all((to_line(e) + "\n").as_bytes())?;
        f.sync_all()
    }

    pub fn replace(&self, events: &[Event], backup: Option<&Path>) -> std::io::Result<()> {
        if let Some(backup) = backup {
            if let Ok(data) = fs::read(&self.path) {
                fs::write(backup, data)?;
            }
        }
        let dir = self.path.parent().unwrap_or(Path::new("."));
        let mut tmp = tempfile::Builder::new()
            .prefix(".events-")
            .tempfile_in(dir)?;
        for e in events {
            tmp.write_all((to_line(e) + "\n").as_bytes())?;
        }
        tmp.persist(&self.path).map_err(|e| e.error)?;
        Ok(())
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jiff::{Timestamp, ToSpan};

    fn event(t: Timestamp, kind: &str, data: &[(&str, &str)]) -> Event {
        Event {
            time: t,
            kind: kind.into(),
            problem: "two-sum".into(),
            attempt: "a1".into(),
            mode: mode::PRACTICE.into(),
            data: data
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        }
    }

    #[test]
    fn round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub/events.jsonl");
        let (log, events, warns) = Log::open(&path);
        assert!(events.is_empty() && warns.is_empty());
        let base: Timestamp = "2026-10-19T15:00:00Z".parse().unwrap();
        let want = vec![
            event(base, kind::OPENED, &[]),
            event(
                base + 1.minute(),
                kind::TEST_RUN,
                &[("passed", "1"), ("total", "2")],
            ),
            event(
                base + 2.minutes(),
                kind::PASSED,
                &[("elapsed_ms", "120000")],
            ),
        ];
        for e in &want {
            log.append(e).unwrap();
        }
        let (_, got, warns) = Log::open(&path);
        assert!(warns.is_empty(), "{warns:?}");
        assert_eq!(got, want);
    }

    #[test]
    fn corrupt_line_is_a_warning() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("events.jsonl");
        fs::write(
            &path,
            "{\"t\":\"2026-10-19T15:00:00Z\",\"kind\":\"opened\",\"problem\":\"a\",\"attempt\":\"x\",\"mode\":\"practice\"}\n\
             not json at all\n\
             {\"t\":\"2026-10-19T15:01:00Z\",\"kind\":\"left\",\"problem\":\"a\",\"attempt\":\"x\",\"mode\":\"practice\"}\n",
        )
        .unwrap();
        let (_, events, warns) = Log::open(&path);
        assert_eq!((events.len(), warns.len()), (2, 1));
        assert!(
            warns[0].contains(":2: skipped unreadable event"),
            "{warns:?}"
        );
    }

    #[test]
    fn replace_keeps_a_backup() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("events.jsonl");
        let (log, _, _) = Log::open(&path);
        let t: Timestamp = "2026-10-19T15:00:00Z".parse().unwrap();
        log.append(&event(t, kind::OPENED, &[])).unwrap();
        let backup = dir.path().join("events.bak");
        log.replace(&[event(t, kind::LEFT, &[])], Some(&backup))
            .unwrap();
        assert!(fs::read_to_string(&backup).unwrap().contains("opened"));
        let (_, events, _) = Log::open(&path);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].kind, kind::LEFT);
    }
}
