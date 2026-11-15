use std::collections::HashMap;

use jiff::civil::Date;
use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp, ToSpan};

use crate::progress::{Event, kind, mode};

pub const RUNGS: [i64; 5] = [1, 3, 7, 14, 30];

/// How well a problem has stuck, by ladder rung, for review copy that talks mastery rather than intervals.
pub fn mastery_stage(rung: i32) -> &'static str {
    match rung {
        i32::MIN..=0 => "just learned",
        1 => "still settling in",
        2 => "getting solid",
        3 => "mastered",
        _ => "locked in",
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Status {
    Unseen,
    Learning,
    Reviewing,
    Mastered,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Status::Unseen => "unseen",
            Status::Learning => "learning",
            Status::Reviewing => "reviewing",
            Status::Mastered => "mastered",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct State {
    pub status: Status,
    /// Index into `RUNGS`; -1 means never finished.
    pub rung: i32,
    pub last_finished: Option<Timestamp>,
    pub first_finished: Option<Timestamp>,
    pub due: Option<Timestamp>,
    pub attempts: u32,
    pub clean_passes: u32,
    pub fails: u32,
    pub hint_attempts: u32,
    pub best_elapsed: SignedDuration,
}

impl Default for State {
    fn default() -> Self {
        State {
            status: Status::Unseen,
            rung: -1,
            last_finished: None,
            first_finished: None,
            due: None,
            attempts: 0,
            clean_passes: 0,
            fails: 0,
            hint_attempts: 0,
            best_elapsed: SignedDuration::ZERO,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    None,
    Pass,
    Fail,
}

#[derive(Debug, Clone)]
pub struct Attempt {
    pub id: String,
    pub problem: String,
    pub start: Timestamp,
    pub end: Option<Timestamp>,
    pub outcome: Outcome,
    pub clean: bool,
    pub elapsed: SignedDuration,
    pub hints: u32,
    pub peeks: u32,
    pub restarts: u32,
    pub mode: String,
}

#[derive(Default)]
struct Extra {
    runs: u32,
    passed_at: Option<Timestamp>,
    end_at: Option<Timestamp>,
    gave_up: bool,
    left: bool,
    elapsed: Option<SignedDuration>,
}

fn ms(data: &std::collections::BTreeMap<String, String>, key: &str) -> SignedDuration {
    data.get(key)
        .and_then(|v| v.parse().ok())
        .map_or(SignedDuration::ZERO, SignedDuration::from_millis)
}

pub fn attempts(events: &[Event], target: impl Fn(&str) -> SignedDuration) -> Vec<Attempt> {
    let mut index: HashMap<&str, usize> = HashMap::new();
    let mut out: Vec<Attempt> = Vec::new();
    let mut extras: Vec<Extra> = Vec::new();
    for e in events {
        // Diagnostic and checkpoint attempts do not move the review ladder.
        if e.mode == mode::PLACEMENT
            || e.mode == mode::CHECKPOINT
            || e.kind == kind::PLACEMENT_DONE
            || e.kind == kind::CHECKPOINT_DONE
            || e.mode == mode::LEETCODE
        {
            continue;
        }
        let i = *index.entry(e.attempt.as_str()).or_insert_with(|| {
            out.push(Attempt {
                id: e.attempt.clone(),
                problem: e.problem.clone(),
                start: e.time,
                end: None,
                outcome: Outcome::None,
                clean: false,
                elapsed: SignedDuration::ZERO,
                hints: 0,
                peeks: 0,
                restarts: 0,
                mode: e.mode.clone(),
            });
            extras.push(Extra::default());
            out.len() - 1
        });
        let (a, x) = (&mut out[i], &mut extras[i]);
        let passed = x.passed_at.is_some();
        match e.kind.as_str() {
            kind::TEST_RUN => x.runs += 1,
            // Looking at hints, the solution or the clock after passing does not undo the pass.
            kind::HINT_REVEALED if !passed => a.hints += 1,
            kind::SOLUTION_PEEKED if !passed => a.peeks += 1,
            kind::TIMER_RESTARTED if !passed => a.restarts += 1,
            kind::PASSED if !passed => {
                x.passed_at = Some(e.time);
                if e.data.contains_key("elapsed_ms") {
                    x.elapsed = Some(ms(&e.data, "elapsed_ms"));
                }
            }
            kind::GAVE_UP if !x.gave_up => {
                x.gave_up = true;
                x.end_at = Some(e.time);
            }
            kind::LEFT if !x.left => {
                x.left = true;
                x.end_at.get_or_insert(e.time);
            }
            _ => {}
        }
    }
    for (a, x) in out.iter_mut().zip(&extras) {
        if let Some(passed_at) = x.passed_at {
            a.outcome = Outcome::Pass;
            a.end = Some(passed_at);
            a.elapsed = x
                .elapsed
                .unwrap_or_else(|| passed_at.duration_since(a.start));
            a.clean =
                a.hints == 0 && a.peeks == 0 && a.restarts == 0 && a.elapsed < target(&a.problem);
        } else if x.gave_up || (x.left && x.runs > 0) {
            a.outcome = Outcome::Fail;
            a.end = x.end_at;
        }
    }
    out
}

pub fn local_day(t: Timestamp, tz: &TimeZone) -> Date {
    t.to_zoned(tz.clone()).date()
}

/// Local midnight `days` calendar days after `t`'s local day; DST-safe, unlike adding hours.
fn midnight_after(t: Timestamp, days: i64, tz: &TimeZone) -> Timestamp {
    let day = local_day(t, tz)
        .checked_add(days.days())
        .expect("due date in range");
    day.to_zoned(tz.clone())
        .expect("local midnight")
        .timestamp()
}

/// Maps a ladder rung to its status; -1 means never finished.
pub fn status_for(rung: i32) -> Status {
    match rung {
        r if r < 0 => Status::Unseen,
        0 | 1 => Status::Learning,
        2 => Status::Reviewing,
        _ => Status::Mastered,
    }
}

pub fn compute(
    events: &[Event],
    target: impl Fn(&str) -> SignedDuration,
    tz: &TimeZone,
) -> HashMap<String, State> {
    let all = attempts(events, target);
    let mut states: HashMap<String, State> = HashMap::new();
    for a in &all {
        states.entry(a.problem.clone()).or_default();
    }
    let imported = crate::leetcode::solved_attempts(events);
    let mut finished: Vec<&Attempt> = all.iter().filter(|a| a.outcome != Outcome::None).collect();
    finished.extend(imported.iter());
    finished.sort_by_key(|a| a.end);
    for a in finished {
        let st = states.remove(&a.problem).unwrap_or_default();
        let next = if a.mode == mode::LEETCODE {
            // Only a first touch: practice already on the ladder is never reset by an import.
            if st.rung < 0 { apply(st, a, tz) } else { st }
        } else if a.mode == mode::DRILL {
            soft_touch(st, a)
        } else {
            apply(st, a, tz)
        };
        states.insert(a.problem.clone(), next);
    }
    states
}

fn record(st: &mut State, a: &Attempt) {
    st.last_finished = a.end;
    st.attempts += 1;
    if a.outcome == Outcome::Fail {
        st.fails += 1;
    }
    if a.hints > 0 {
        st.hint_attempts += 1;
    }
    if a.clean {
        st.clean_passes += 1;
    }
    if a.outcome == Outcome::Pass && (st.best_elapsed.is_zero() || a.elapsed < st.best_elapsed) {
        st.best_elapsed = a.elapsed;
    }
}

/// Records a keep-sharp drill without moving due or rung. Freshness and struggle stats
/// still update so Today can prefer cold or shaky work next time.
pub fn soft_touch(mut st: State, a: &Attempt) -> State {
    if st.rung < 0 {
        return st; // drills never introduce unseen problems
    }
    record(&mut st, a);
    st
}

/// First finish lands on 1d, a clean pass on a later day climbs one rung, a clean pass
/// on the same day changes nothing, anything else drops to 1d.
pub fn apply(mut st: State, a: &Attempt, tz: &TimeZone) -> State {
    let end = a.end.expect("finished attempts have an end");
    let later_day = st
        .last_finished
        .is_none_or(|last| local_day(end, tz) > local_day(last, tz));
    if st.rung < 0 {
        st.rung = 0;
        st.first_finished = Some(end);
    } else if a.clean && later_day {
        st.rung = (st.rung + 1).min(RUNGS.len() as i32 - 1);
    } else if !a.clean {
        st.rung = 0;
    }
    record(&mut st, a);
    st.status = status_for(st.rung);
    st.due = Some(midnight_after(end, RUNGS[st.rung as usize], tz));
    st
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    use std::collections::BTreeMap;

    thread_local!(static N: Cell<u32> = const { Cell::new(0) });

    fn chicago() -> TimeZone {
        TimeZone::get("America/Chicago").unwrap()
    }

    fn target(_: &str) -> SignedDuration {
        SignedDuration::from_mins(30)
    }

    fn at(day: i8, hh: i8, mm: i8) -> Timestamp {
        jiff::civil::date(2026, 10, day)
            .at(hh, mm, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp()
    }

    fn local_midnight(day: i8) -> Timestamp {
        at(day, 0, 0)
    }

    fn mins(m: i64) -> SignedDuration {
        SignedDuration::from_mins(m)
    }

    fn data(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    fn ev(t: Timestamp, k: &str, id: &str, m: &str, d: BTreeMap<String, String>) -> Event {
        Event {
            time: t,
            kind: k.into(),
            problem: "p".into(),
            attempt: id.into(),
            mode: m.into(),
            data: d,
        }
    }

    struct Step(&'static str, SignedDuration, BTreeMap<String, String>);

    fn attempt(start: Timestamp, steps: Vec<Step>) -> Vec<Event> {
        let id = N.with(|n| {
            n.set(n.get() + 1);
            format!("att{}", n.get())
        });
        let mut evs = vec![ev(
            start,
            kind::OPENED,
            &id,
            mode::PRACTICE,
            BTreeMap::new(),
        )];
        for Step(k, off, d) in steps {
            evs.push(ev(start + off, k, &id, mode::PRACTICE, d));
        }
        evs
    }

    fn run(off: SignedDuration) -> Step {
        Step(
            kind::TEST_RUN,
            off,
            data(&[("passed", "1"), ("total", "1")]),
        )
    }
    fn pass(off: SignedDuration) -> Step {
        Step(
            kind::PASSED,
            off,
            data(&[("elapsed_ms", &off.as_millis().to_string())]),
        )
    }
    fn hint(off: SignedDuration) -> Step {
        Step(kind::HINT_REVEALED, off, BTreeMap::new())
    }
    fn bare(k: &'static str, off: SignedDuration) -> Step {
        Step(k, off, BTreeMap::new())
    }
    fn clean_pass(start: Timestamp) -> Vec<Event> {
        attempt(start, vec![run(mins(5)), pass(mins(10))])
    }

    fn state(events: &[Event]) -> State {
        compute(events, target, &chicago())
            .remove("p")
            .unwrap_or_default()
    }

    #[test]
    fn schedule_table() {
        let ladder = || {
            [
                clean_pass(at(1, 10, 0)),
                clean_pass(at(2, 10, 0)),
                clean_pass(at(5, 10, 0)),
            ]
            .concat()
        };
        // (name, events, status, rung, due day)
        type Case = (&'static str, Vec<Event>, Status, i32, Option<i8>);
        let cases: Vec<Case> = vec![
            (
                "first pass",
                clean_pass(at(1, 10, 0)),
                Status::Learning,
                0,
                Some(2),
            ),
            (
                "climb to mastered",
                [ladder(), clean_pass(at(12, 10, 0))].concat(),
                Status::Mastered,
                3,
                Some(26),
            ),
            (
                "same-day second pass",
                [clean_pass(at(1, 10, 0)), clean_pass(at(1, 18, 0))].concat(),
                Status::Learning,
                0,
                Some(2),
            ),
            (
                "hint pass drops",
                [
                    ladder(),
                    clean_pass(at(12, 10, 0)),
                    attempt(at(26, 10, 0), vec![hint(mins(1)), pass(mins(5))]),
                ]
                .concat(),
                Status::Learning,
                0,
                Some(27),
            ),
            (
                "over target drops",
                [
                    clean_pass(at(1, 10, 0)),
                    attempt(at(2, 10, 0), vec![pass(mins(40))]),
                ]
                .concat(),
                Status::Learning,
                0,
                Some(3),
            ),
            (
                "gave up drops",
                [
                    clean_pass(at(1, 10, 0)),
                    clean_pass(at(2, 10, 0)),
                    attempt(at(5, 10, 0), vec![bare(kind::GAVE_UP, mins(1))]),
                ]
                .concat(),
                Status::Learning,
                0,
                Some(6),
            ),
            (
                "left after run is fail",
                [
                    clean_pass(at(1, 10, 0)),
                    clean_pass(at(2, 10, 0)),
                    attempt(at(5, 10, 0), vec![run(mins(1)), bare(kind::LEFT, mins(2))]),
                ]
                .concat(),
                Status::Learning,
                0,
                Some(6),
            ),
            (
                "left without run is nothing",
                attempt(at(1, 10, 0), vec![bare(kind::LEFT, mins(1))]),
                Status::Unseen,
                -1,
                None,
            ),
            (
                "first finished is a fail",
                attempt(at(1, 10, 0), vec![bare(kind::GAVE_UP, mins(1))]),
                Status::Learning,
                0,
                Some(2),
            ),
            (
                "reviewing at rung 2",
                ladder(),
                Status::Reviewing,
                2,
                Some(12),
            ),
        ];
        for (name, events, status, rung, due) in cases {
            let st = state(&events);
            assert_eq!((st.status, st.rung), (status, rung), "{name}");
            assert_eq!(st.due, due.map(local_midnight), "{name}");
        }
    }

    #[test]
    fn day_rollover_uses_event_time() {
        let events = [
            attempt(at(1, 23, 40), vec![pass(mins(10))]), // passes 23:50 day 1
            attempt(at(2, 0, 5), vec![pass(mins(5))]),    // passes 00:10 day 2
        ]
        .concat();
        assert_eq!(state(&events).rung, 1);
    }

    #[test]
    fn attempts_counts_and_clean() {
        let events = [
            clean_pass(at(1, 10, 0)),
            attempt(
                at(2, 10, 0),
                vec![
                    hint(mins(1)),
                    bare(kind::SOLUTION_PEEKED, mins(2)),
                    pass(mins(5)),
                ],
            ),
        ]
        .concat();
        let atts = attempts(&events, target);
        assert_eq!(atts.len(), 2);
        assert!(atts[0].clean && atts[0].elapsed == mins(10) && atts[0].outcome == Outcome::Pass);
        assert!(!atts[1].clean && atts[1].hints == 1 && atts[1].peeks == 1);
        let st = state(&events);
        assert_eq!(
            (
                st.attempts,
                st.clean_passes,
                st.hint_attempts,
                st.best_elapsed
            ),
            (2, 1, 1, mins(5))
        );
    }

    #[test]
    fn interview_penalty_counts_toward_time() {
        // elapsed_ms already includes the 3m penalty the TUI added to the clock.
        let events = attempt(
            at(1, 10, 0),
            vec![
                Step(
                    kind::HINT_REVEALED,
                    mins(1),
                    data(&[("penalty_ms", "180000")]),
                ),
                pass(mins(31)),
            ],
        );
        let atts = attempts(&events, target);
        assert_eq!(atts[0].elapsed, mins(31));
        assert!(!atts[0].clean);
    }

    #[test]
    fn hint_after_pass_keeps_pass_clean() {
        let events = attempt(
            at(1, 10, 0),
            vec![
                pass(mins(5)),
                hint(mins(6)),
                bare(kind::SOLUTION_PEEKED, mins(7)),
            ],
        );
        let a = &attempts(&events, target)[0];
        assert!(a.clean && a.hints == 0 && a.peeks == 0, "{a:?}");
    }

    #[test]
    fn apply_one_attempt() {
        let st = State {
            status: Status::Learning,
            rung: 1,
            last_finished: Some(at(2, 10, 0)),
            ..State::default()
        };
        let a = Attempt {
            id: String::new(),
            problem: "p".into(),
            start: at(5, 9, 0),
            end: Some(at(5, 10, 0)),
            outcome: Outcome::Pass,
            clean: true,
            elapsed: mins(4),
            hints: 0,
            peeks: 0,
            restarts: 0,
            mode: mode::PRACTICE.into(),
        };
        let next = apply(st, &a, &chicago());
        assert_eq!(
            (next.rung, next.status, next.due, next.best_elapsed),
            (2, Status::Reviewing, Some(local_midnight(12)), mins(4))
        );
        let fresh = apply(State::default(), &a, &chicago());
        assert_eq!((fresh.rung, fresh.first_finished), (0, a.end));
    }

    #[test]
    fn status_for_rung() {
        for (rung, want) in [
            (-1, Status::Unseen),
            (0, Status::Learning),
            (1, Status::Learning),
            (2, Status::Reviewing),
            (3, Status::Mastered),
            (4, Status::Mastered),
        ] {
            assert_eq!(status_for(rung), want, "{rung}");
        }
    }

    #[test]
    fn placement_and_checkpoint_are_skipped() {
        for (m, done) in [
            (mode::PLACEMENT, kind::PLACEMENT_DONE),
            (mode::CHECKPOINT, kind::CHECKPOINT_DONE),
        ] {
            let events = vec![
                ev(at(1, 10, 0), kind::OPENED, "x1", m, BTreeMap::new()),
                ev(
                    at(1, 10, 5),
                    kind::PASSED,
                    "x1",
                    m,
                    data(&[("elapsed_ms", "300000")]),
                ),
                ev(at(1, 10, 6), done, "", m, data(&[("skipped", "1")])),
            ];
            assert!(attempts(&events, target).is_empty(), "{m}");
            assert_eq!(state(&events).attempts, 0, "{m}");
        }
    }

    #[test]
    fn drill_soft_touch_does_not_move_ladder() {
        let practice = |id: &str, day: i8| {
            vec![
                ev(
                    at(day, 10, 0),
                    kind::OPENED,
                    id,
                    mode::PRACTICE,
                    BTreeMap::new(),
                ),
                ev(
                    at(day, 10, 5),
                    kind::PASSED,
                    id,
                    mode::PRACTICE,
                    data(&[("elapsed_ms", "300000")]),
                ),
            ]
        };
        let mut events = [practice("a0", 1), practice("a1", 2), practice("a2", 5)].concat();
        let before = state(&events);
        assert!(before.rung >= 2);
        let drill_at = at(10, 12, 0);
        events.extend([
            ev(
                drill_at,
                kind::OPENED,
                "drill1",
                mode::DRILL,
                BTreeMap::new(),
            ),
            ev(
                drill_at + mins(1),
                kind::HINT_REVEALED,
                "drill1",
                mode::DRILL,
                BTreeMap::new(),
            ),
            ev(
                drill_at + mins(2),
                kind::PASSED,
                "drill1",
                mode::DRILL,
                data(&[("elapsed_ms", "120000")]),
            ),
        ]);
        let after = state(&events);
        assert_eq!((after.rung, after.due), (before.rung, before.due));
        assert_eq!(after.last_finished, Some(drill_at + mins(2)));
        assert_eq!(
            (after.attempts, after.hint_attempts),
            (before.attempts + 1, before.hint_attempts + 1)
        );
    }

    #[test]
    fn timer_restart_makes_pass_unclean() {
        let events = attempt(
            at(1, 10, 0),
            vec![bare(kind::TIMER_RESTARTED, mins(1)), pass(mins(5))],
        );
        let a = &attempts(&events, target)[0];
        assert!(
            !a.clean && a.restarts == 1 && a.outcome == Outcome::Pass,
            "{a:?}"
        );
    }

    #[test]
    fn due_is_local_midnight_across_dst() {
        // US clocks fall back on 2026-11-01; 24h after Nov 1 midnight is Nov 1 23:00 local.
        let nov1 = jiff::civil::date(2026, 11, 1)
            .at(10, 0, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp();
        let events = attempt(nov1, vec![pass(mins(5))]);
        let want = jiff::civil::date(2026, 11, 2)
            .to_zoned(chicago())
            .unwrap()
            .timestamp();
        assert_eq!(state(&events).due, Some(want));
    }
}
