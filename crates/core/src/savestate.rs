//! Reads and writes `progress.toml`, the learner's save file. It is the scheduling
//! source of truth and is meant to be edited by hand.

use std::collections::{HashMap, HashSet};
use std::fmt::{self, Write as _};

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};
use serde::Deserialize;

use crate::catalog::Catalog;
use crate::godur;
use crate::schedule::{RUNGS, State, status_for};

const HEADER: &str = "# myleet save file. You can edit this file by hand:
#   - delete a [problem] block to reset that problem
#   - change due = YYYY-MM-DD to move its next review
#   - set rung to 1d, 3d, 7d, 14d or 30d (14d and 30d count as mastered)
# myleet checks this file on start and will not overwrite it while it is broken.
";

#[derive(Deserialize, Default)]
#[serde(default)]
struct Entry {
    rung: String,
    due: Option<toml::value::Datetime>,
    last: Option<toml::value::Datetime>,
    first: Option<toml::value::Datetime>,
    attempts: u32,
    clean_passes: u32,
    best: String,
}

#[derive(Debug)]
pub enum ReadError {
    Missing,
    Io(std::io::Error),
    /// The file is broken; the message names the path and what to fix.
    Invalid(String),
}

impl fmt::Display for ReadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ReadError::Missing => f.write_str("no save file"),
            ReadError::Io(e) => write!(f, "{e}"),
            ReadError::Invalid(msg) => f.write_str(msg),
        }
    }
}

impl std::error::Error for ReadError {}

fn rung_index(label: &str) -> Option<i32> {
    RUNGS
        .iter()
        .position(|days| label == format!("{days}d"))
        .map(|i| i as i32)
}

fn day(dt: Option<toml::value::Datetime>, tz: &TimeZone) -> Option<Timestamp> {
    let d = dt?.date?;
    let date = jiff::civil::Date::new(d.year as i16, d.month as i8, d.day as i8).ok()?;
    Some(date.to_zoned(tz.clone()).ok()?.timestamp())
}

/// `source` names the file in error messages.
pub fn parse(text: &str, source: &str, tz: &TimeZone) -> Result<HashMap<String, State>, ReadError> {
    let p = source;
    let raw: HashMap<String, Entry> = toml::from_str(text).map_err(|e| match e.span() {
        Some(span) => {
            let line = text[..span.start].matches('\n').count() + 1;
            ReadError::Invalid(format!("{p} line {line}: {}", e.message()))
        }
        None => ReadError::Invalid(format!("{p}: {}", e.message())),
    })?;
    let invalid = |msg: String| ReadError::Invalid(msg);
    let mut states = HashMap::with_capacity(raw.len());
    for (id, e) in raw {
        let rung = rung_index(&e.rung).ok_or_else(|| {
            invalid(format!(
                "{p}: [{id}] rung {:?} must be one of 1d, 3d, 7d, 14d, 30d",
                e.rung
            ))
        })?;
        let last = day(e.last, tz)
            .ok_or_else(|| invalid(format!("{p}: [{id}] needs last = YYYY-MM-DD")))?;
        let mut st = State {
            status: status_for(rung),
            rung,
            last_finished: Some(last),
            first_finished: day(e.first, tz).or(Some(last)),
            due: day(e.due, tz),
            attempts: e.attempts,
            clean_passes: e.clean_passes,
            ..State::default()
        };
        if st.due.is_none() {
            let days = jiff::ToSpan::days(RUNGS[rung as usize]);
            let due = last.to_zoned(tz.clone()).date().checked_add(days).ok();
            st.due = due
                .and_then(|d| d.to_zoned(tz.clone()).ok())
                .map(|z| z.timestamp());
        }
        if !e.best.is_empty() {
            let best = godur::parse(&e.best).map_err(|_| {
                invalid(format!(
                    "{p}: [{id}] best {:?} is not a duration like 4m12s",
                    e.best
                ))
            })?;
            st.best_elapsed = SignedDuration::try_from(best).unwrap_or(SignedDuration::ZERO);
        }
        states.insert(id, st);
    }
    Ok(states)
}

fn date(t: Option<Timestamp>, tz: &TimeZone) -> String {
    t.map_or_else(
        || "0001-01-01".to_string(),
        |t| t.to_zoned(tz.clone()).date().to_string(),
    )
}

/// Keeps ids missing from the catalog (written last) so hand edits are never lost.
pub fn render(c: &Catalog, states: &HashMap<String, State>, tz: &TimeZone) -> String {
    let known: HashSet<&str> = c.problems().iter().map(|p| p.id.as_str()).collect();
    let mut unknown: Vec<&str> = states
        .keys()
        .map(String::as_str)
        .filter(|id| !known.contains(id))
        .collect();
    unknown.sort_unstable();
    let ids = c.problems().iter().map(|p| p.id.as_str()).chain(unknown);
    let mut b = String::from(HEADER);
    for id in ids {
        let Some(st) = states.get(id).filter(|st| st.rung >= 0) else {
            continue;
        };
        let _ = write!(b, "\n[{id}]\n");
        let _ = writeln!(b, "rung = \"{}d\"", RUNGS[st.rung as usize]);
        let _ = writeln!(b, "due = {}", date(st.due, tz));
        let _ = writeln!(b, "last = {}", date(st.last_finished, tz));
        if st.first_finished.is_some() {
            let _ = writeln!(b, "first = {}", date(st.first_finished, tz));
        }
        let _ = writeln!(b, "attempts = {}", st.attempts);
        let _ = writeln!(b, "clean_passes = {}", st.clean_passes);
        if st.best_elapsed.is_positive() {
            let _ = writeln!(b, "best = \"{}\"", godur::format_secs(st.best_elapsed));
        }
    }
    b
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schedule::Status;
    use crate::testutil::{chicago, good_catalog};

    const COMPAT_EVENTS: &str = include_str!("../../../src/testdata/compat/events.jsonl");
    const COMPAT_SAVE: &str = include_str!("../../../src/testdata/compat/progress.toml");

    fn midnight(day: i8) -> Option<Timestamp> {
        Some(crate::testutil::midnight(day))
    }

    fn sample() -> HashMap<String, State> {
        HashMap::from([
            (
                "p-two".to_string(),
                State {
                    status: Status::Learning,
                    rung: 1,
                    due: midnight(23),
                    last_finished: midnight(20),
                    first_finished: midnight(19),
                    attempts: 2,
                    clean_passes: 1,
                    best_elapsed: SignedDuration::from_secs(252),
                    ..State::default()
                },
            ),
            (
                "two-sum".to_string(),
                State {
                    status: Status::Mastered,
                    rung: 3,
                    due: midnight(30),
                    last_finished: midnight(16),
                    first_finished: midnight(1),
                    attempts: 4,
                    clean_passes: 4,
                    best_elapsed: SignedDuration::from_mins(1),
                    ..State::default()
                },
            ),
            ("p-one".to_string(), State::default()),
        ])
    }

    fn saved(states: &HashMap<String, State>) -> String {
        render(&good_catalog(), states, &chicago())
    }

    fn read_text(text: &str) -> Result<HashMap<String, State>, ReadError> {
        parse(text, "progress.toml", &chicago())
    }

    #[test]
    fn write_is_editable_and_ordered() {
        let text = saved(&sample());
        assert!(text.contains("You can edit this file") && !text.contains("DO NOT EDIT"));
        assert!(!text.contains("[p-one]"), "unseen problems are left out");
        assert!(
            text.find("[p-two]") < text.find("[two-sum]"),
            "curriculum order:\n{text}"
        );
        assert!(text.contains("rung = \"3d\"\ndue = 2026-10-23\n"), "{text}");
        assert!(text.contains("best = \"4m12s\"\n"), "{text}");
    }

    #[test]
    fn round_trip() {
        let want = sample();
        let got = read_text(&saved(&want)).unwrap();
        assert_eq!(got.len(), 2);
        for (id, w) in want.iter().filter(|(_, w)| w.rung >= 0) {
            assert_eq!(&got[id], w, "{id}");
        }
    }

    #[test]
    fn rejects_bad_rung_last_and_best() {
        let err = read_text("[two-sum]\nrung = \"5d\"\ndue = 2026-10-23\nlast = 2026-10-20\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("two-sum") && err.contains("5d"), "{err}");
        let err = read_text("[two-sum]\nrung = \"1d\"\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("needs last"), "{err}");
        let err = read_text("[two-sum]\nrung = \"1d\"\nlast = 2026-10-20\nbest = \"soon\"\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("4m12s"), "{err}");
    }

    #[test]
    fn syntax_error_names_the_line() {
        let err = read_text("[two-sum]\nrung = \"1d\"\ndue = oops\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("progress.toml line 3"), "{err}");
    }

    #[test]
    fn missing_due_and_first_are_derived() {
        let got = read_text("[two-sum]\nrung = \"3d\"\nlast = 2026-10-20\n").unwrap();
        let st = &got["two-sum"];
        assert_eq!(
            (st.due, st.first_finished, st.status),
            (midnight(23), midnight(20), Status::Learning)
        );
    }

    #[test]
    fn write_keeps_unknown_ids() {
        let mut states = sample();
        states.insert(
            "removed-problem".into(),
            State {
                status: Status::Learning,
                rung: 0,
                due: midnight(21),
                last_finished: midnight(20),
                ..State::default()
            },
        );
        assert!(
            read_text(&saved(&states))
                .unwrap()
                .contains_key("removed-problem")
        );
    }

    // Existing learners' files: these must read and write back byte for byte.
    #[test]
    fn go_events_round_trip_byte_for_byte() {
        let (events, warns) = crate::progress::parse_lines(COMPAT_EVENTS, "events.jsonl");
        assert!(warns.is_empty(), "{warns:?}");
        let text: String = events
            .iter()
            .map(|e| crate::progress::to_line(e) + "\n")
            .collect();
        assert_eq!(text, COMPAT_EVENTS);
    }

    #[test]
    fn go_history_computes_the_go_save_file() {
        let c = good_catalog();
        let (events, _) = crate::progress::parse_lines(COMPAT_EVENTS, "events.jsonl");
        let target = |id: &str| {
            c.problem(id).map_or(SignedDuration::ZERO, |p| {
                SignedDuration::try_from(p.time_target).unwrap()
            })
        };
        let mut states = crate::schedule::compute(&events, target, &chicago());
        states.insert(
            "removed-problem".into(),
            State {
                rung: 2,
                due: midnight(20),
                last_finished: midnight(13),
                best_elapsed: SignedDuration::from_secs(3723),
                ..State::default()
            },
        );
        assert_eq!(render(&c, &states, &chicago()), COMPAT_SAVE);
    }

    #[test]
    fn go_save_file_round_trips_byte_for_byte() {
        let c = good_catalog();
        let states = read_text(COMPAT_SAVE).unwrap();
        // A block without `first` takes it from `last`, so it is written back.
        let want = COMPAT_SAVE.replace(
            "last = 2026-10-13\n",
            "last = 2026-10-13\nfirst = 2026-10-13\n",
        );
        assert_eq!(render(&c, &states, &chicago()), want);
    }
}
