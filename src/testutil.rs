//! Test fixtures mirroring `internal/testutil`.

use std::collections::BTreeMap;

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};

use crate::catalog::{self, Catalog};
use crate::progress::Event;
use crate::schedule::{Attempt, Outcome};

pub fn chicago() -> TimeZone {
    TimeZone::get("America/Chicago").unwrap()
}

pub fn good_catalog() -> Catalog {
    catalog::load(&catalog::testdata("good")).unwrap_or_else(|e| panic!("{e:?}"))
}

fn chicago_at(day: i8, hour: i8) -> Timestamp {
    jiff::civil::date(2026, 10, day)
        .at(hour, 0, 0, 0)
        .to_zoned(chicago())
        .unwrap()
        .timestamp()
}

/// Local Chicago noon on 2026-10-<day>.
pub fn day(day: i8) -> Timestamp {
    chicago_at(day, 12)
}

pub fn midnight(day: i8) -> Timestamp {
    chicago_at(day, 0)
}

/// An attempt with only the problem and outcome set, like a Go struct literal.
pub fn attempt(problem: &str, outcome: Outcome) -> Attempt {
    Attempt {
        id: String::new(),
        problem: problem.into(),
        start: Timestamp::UNIX_EPOCH,
        end: None,
        outcome,
        clean: false,
        elapsed: SignedDuration::ZERO,
        hints: 0,
        peeks: 0,
        restarts: 0,
        mode: String::new(),
    }
}

pub fn event(time: Timestamp, kind: &str, mode: &str, data: BTreeMap<String, String>) -> Event {
    Event {
        time,
        kind: kind.into(),
        problem: String::new(),
        attempt: String::new(),
        mode: mode.into(),
        data,
    }
}
