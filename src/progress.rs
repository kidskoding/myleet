//! The append-only history of every learner action; stats are computed from it,
//! scheduling lives in the save file.

use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};

use jiff::Timestamp;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

// Kinds and modes stay strings so a line from a newer build round-trips unchanged.
pub mod kind {
    pub const OPENED: &str = "opened";
    pub const HINT_REVEALED: &str = "hint_revealed";
    pub const SOLUTION_PEEKED: &str = "solution_peeked";
    pub const TEST_RUN: &str = "test_run";
    pub const PASSED: &str = "passed";
    pub const GAVE_UP: &str = "gave_up";
    pub const LEFT: &str = "left";
    pub const RESET: &str = "reset";
    pub const SAY_ALOUD_CHECKED: &str = "say_aloud_checked";
    pub const TIMER_RESTARTED: &str = "timer_restarted";
    /// The new-user diagnostic finished or was skipped.
    pub const PLACEMENT_DONE: &str = "placement_done";
    /// A curriculum-slice checkpoint exam finished.
    pub const CHECKPOINT_DONE: &str = "checkpoint_done";
}

pub mod mode {
    pub const PRACTICE: &str = "practice";
    pub const INTERVIEW: &str = "interview";
    pub const PLACEMENT: &str = "placement";
    pub const CHECKPOINT: &str = "checkpoint";
    /// A keep-sharp attempt: counts for streak/stats freshness but does not climb or
    /// drop the spaced-repetition ladder.
    pub const DRILL: &str = "drill";
}

/// Data keys: test_run passed,total; passed elapsed_ms; say_aloud_checked item;
/// hint_revealed penalty_ms (interview mode).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Event {
    #[serde(
        rename = "t",
        serialize_with = "ser_time",
        deserialize_with = "de_time"
    )]
    pub time: Timestamp,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub problem: String,
    #[serde(default)]
    pub attempt: String,
    #[serde(default)]
    pub mode: String,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub data: BTreeMap<String, String>,
}

/// Go's `time.RFC3339Nano` in UTC: fraction trimmed of trailing zeros, dropped when zero.
pub fn format_time(t: Timestamp) -> String {
    t.strftime("%Y-%m-%dT%H:%M:%S%.fZ").to_string()
}

fn ser_time<S: Serializer>(t: &Timestamp, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&format_time(*t))
}

fn de_time<'de, D: Deserializer<'de>>(d: D) -> Result<Timestamp, D::Error> {
    let text = String::deserialize(d)?;
    text.parse().map_err(serde::de::Error::custom)
}

/// One JSON line the way Go's `encoding/json` writes it, HTML escaping included.
pub fn to_line(e: &Event) -> String {
    let json = serde_json::to_string(e).expect("events always serialize");
    json.replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029")
}

pub fn new_attempt_id() -> String {
    let mut b = [0u8; 6];
    getrandom::fill(&mut b).expect("os random source");
    b.iter().map(|x| format!("{x:02x}")).collect()
}

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
        let (mut events, mut warns) = (Vec::new(), Vec::new());
        for (i, line) in text.lines().enumerate() {
            if line.is_empty() {
                continue;
            }
            match serde_json::from_str::<Event>(line) {
                Ok(e) => events.push(e),
                Err(err) => warns.push(format!(
                    "{}:{}: skipped unreadable event: {err}",
                    path.display(),
                    i + 1
                )),
            }
        }
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
    use jiff::ToSpan;

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
    fn json_matches_go_encoding() {
        let t: Timestamp = "2026-10-19T15:00:00.120Z".parse().unwrap();
        let e = event(t, "future_kind", &[("item", "a<b & c>d")]);
        assert_eq!(
            to_line(&e),
            r#"{"t":"2026-10-19T15:00:00.12Z","kind":"future_kind","problem":"two-sum","attempt":"a1","mode":"practice","data":{"item":"a\u003cb \u0026 c\u003ed"}}"#
        );
        let whole = event("2026-10-19T15:00:00Z".parse().unwrap(), kind::OPENED, &[]);
        assert!(to_line(&whole).starts_with(r#"{"t":"2026-10-19T15:00:00Z","kind":"opened""#));
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

    #[test]
    fn attempt_ids_are_random_hex() {
        let (a, b) = (new_attempt_id(), new_attempt_id());
        assert_eq!(a.len(), 12);
        assert_ne!(a, b);
        assert!(a.bytes().all(|c| c.is_ascii_hexdigit()));
    }
}
