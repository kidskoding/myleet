//! The append-only history of every learner action; stats are computed from it,
//! scheduling lives in the save file.

use std::collections::BTreeMap;

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
    pub const CHECKPOINT_DONE: &str = "checkpoint_done";
    /// The learner connected LeetCode: username, total solves and solves per module.
    pub const LEETCODE_IMPORTED: &str = "leetcode_imported";
    /// A recent accepted LeetCode problem we also teach: a started, not clean, first attempt.
    pub const LEETCODE_SOLVED: &str = "leetcode_solved";
    /// The learner disconnected LeetCode; earlier import events no longer count.
    pub const LEETCODE_DISCONNECTED: &str = "leetcode_disconnected";
}

pub mod mode {
    pub const PRACTICE: &str = "practice";
    pub const INTERVIEW: &str = "interview";
    pub const PLACEMENT: &str = "placement";
    pub const CHECKPOINT: &str = "checkpoint";
    pub const LEETCODE: &str = "leetcode";
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

/// UTC RFC 3339, fraction trimmed of trailing zeros and dropped when zero, matching existing logs.
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

/// One JSON line with HTML escaping, matching the lines existing logs already hold.
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

/// Parses a JSONL history. Unreadable lines become `source:line:` warnings so one
/// corrupt line cannot lock the learner out of their history.
pub fn parse_lines(text: &str, source: &str) -> (Vec<Event>, Vec<String>) {
    let (mut events, mut warns) = (Vec::new(), Vec::new());
    for (i, line) in text.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        match serde_json::from_str::<Event>(line) {
            Ok(e) => events.push(e),
            Err(err) => warns.push(format!(
                "{source}:{}: skipped unreadable event: {err}",
                i + 1
            )),
        }
    }
    (events, warns)
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn corrupt_line_is_a_warning() {
        let (events, warns) = parse_lines(
            "{\"t\":\"2026-10-19T15:00:00Z\",\"kind\":\"opened\",\"problem\":\"a\",\"attempt\":\"x\",\"mode\":\"practice\"}\n\
             not json at all\n\
             {\"t\":\"2026-10-19T15:01:00Z\",\"kind\":\"left\",\"problem\":\"a\",\"attempt\":\"x\",\"mode\":\"practice\"}\n",
            "events.jsonl",
        );
        assert_eq!((events.len(), warns.len()), (2, 1));
        assert!(
            warns[0].starts_with("events.jsonl:2: skipped unreadable event"),
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
    fn attempt_ids_are_random_hex() {
        let (a, b) = (new_attempt_id(), new_attempt_id());
        assert_eq!(a.len(), 12);
        assert_ne!(a, b);
        assert!(a.bytes().all(|c| c.is_ascii_hexdigit()));
    }
}
