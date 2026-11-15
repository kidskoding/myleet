use std::collections::{HashMap, HashSet};

use jiff::Timestamp;
use jiff::civil::Date;
use jiff::tz::TimeZone;

use crate::catalog::{Catalog, Difficulty, Problem};
use crate::progress::Event;
use crate::schedule::{RUNGS, State, Status, local_day};
use crate::skills::{self, ActionKind, Report};
use crate::{checkpoint, placement};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Review,
    New,
    Practice,
}

impl Kind {
    pub fn as_str(self) -> &'static str {
        match self {
            Kind::Review => "review",
            Kind::New => "new",
            Kind::Practice => "practice",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Reason {
    Weak,
    InProgress,
    NewTopic,
    KeepSharp,
    InterviewMix,
    ColdRedo,
}

impl Reason {
    pub fn as_str(self) -> &'static str {
        match self {
            Reason::Weak => "weak spot",
            Reason::InProgress => "in progress",
            Reason::NewTopic => "new topic",
            Reason::KeepSharp => "keep sharp",
            Reason::InterviewMix => "interview mix",
            Reason::ColdRedo => "cold redo",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Item<'a> {
    pub problem: &'a Problem,
    pub kind: Kind,
    /// `State::default()` for new problems.
    pub state: State,
    pub overdue_days: i64,
    /// `None` for reviews.
    pub reason: Option<Reason>,
    /// One plain sentence on why this item is here, from the skill model.
    pub why: String,
}

/// Share of non-clean attempts above which a technique is a weak spot.
const WEAK_SHARE: f64 = 0.5;
/// Days since the last finish before a problem is a "cold redo".
const COLD_DAYS: i64 = 7;
const DEFAULT_KEEP_SHARP_SLOTS: u32 = 3;

fn midnight(d: Date, tz: &TimeZone) -> Timestamp {
    d.to_zoned(tz.clone()).expect("local midnight").timestamp()
}

fn days_between(from: Date, to: Date) -> i64 {
    i64::from((to - from).get_days())
}

/// Due on or before today's local midnight; a missing due date counts as due.
fn is_due(st: &State, day: Timestamp) -> bool {
    st.due.is_none_or(|d| d <= day)
}

/// Due reviews, most overdue first, then new problems picked from the learner's
/// own history: techniques they started and struggle with (or that placement and
/// checkpoint results flagged), then other started techniques, then untouched ones
/// in reading order. New problems rotate across techniques, and the slots shrink by
/// new problems already finished today. When nothing is due and no new slots
/// remain, it fills a keep-sharp drill queue so a caught-up or fully mastered
/// learner still has interview-ready practice.
pub fn today<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    now: Timestamp,
    tz: &TimeZone,
    new_per_day: u32,
    events: &[Event],
) -> Vec<Item<'a>> {
    let today = local_day(now, tz);
    let day = midnight(today, tz);
    let mut reviews = Vec::new();
    let mut started_today = 0;
    for p in c.problems() {
        let Some(st) = states.get(&p.id).filter(|st| st.status != Status::Unseen) else {
            continue;
        };
        if st.first_finished.is_some_and(|f| local_day(f, tz) == today) {
            started_today += 1;
        }
        if is_due(st, day) {
            reviews.push(Item {
                problem: p,
                kind: Kind::Review,
                state: st.clone(),
                overdue_days: st.due.map_or(0, |d| days_between(local_day(d, tz), today)),
                reason: None,
                why: String::new(),
            });
        }
    }
    reviews.sort_by(|a, b| {
        b.overdue_days
            .cmp(&a.overdue_days)
            .then(a.problem.order.cmp(&b.problem.order))
    });
    let report = skills::assess(c, events, states, now, tz);
    let weak = weak_modules(events);
    let mut out = reviews;
    out.extend(pick_new(
        c,
        states,
        new_per_day.saturating_sub(started_today),
        &weak,
        &report,
    ));
    if out.is_empty() {
        let slots = if new_per_day == 0 {
            DEFAULT_KEEP_SHARP_SLOTS
        } else {
            new_per_day
        };
        out = pick_keep_sharp(c, states, today, tz, slots as usize);
    }
    for it in &mut out {
        it.why = why(c, it, &report, &weak, today, tz);
    }
    out
}

/// The reason line shown on a queue row.
pub fn why(
    c: &Catalog,
    it: &Item,
    report: &Report,
    weak: &HashMap<String, &'static str>,
    today: Date,
    tz: &TimeZone,
) -> String {
    let tech = &c.technique_of(it.problem).title;
    let skill = report.of(it.problem);
    if it.kind == Kind::Review {
        let gap = RUNGS[it.state.rung.clamp(0, RUNGS.len() as i32 - 1) as usize];
        return if it.overdue_days > 0 {
            format!("overdue {}d: {gap}-day review", it.overdue_days)
        } else {
            format!("due: {gap}-day review")
        };
    }
    if let Some(a) = skill.and_then(|s| {
        s.actions
            .iter()
            .find(|a| a.problem == Some(it.problem.order) && a.kind != ActionKind::Next)
    }) {
        return a.reason.clone();
    }
    let days_ago = it
        .state
        .last_finished
        .map_or(0, |t| days_between(local_day(t, tz), today));
    match it.reason {
        Some(Reason::Weak) => match skill.filter(|s| s.evidence.attempts > 0) {
            Some(s) => format!("weak spot: {tech}, {}", s.struggle_text()),
            None => {
                let m = c.module_of(it.problem);
                let by = weak.get(&m.id).copied().unwrap_or("check-in");
                format!(
                    "weak spot: your {by} flagged {}",
                    skills::mid_sentence(&m.title)
                )
            }
        },
        Some(Reason::InProgress) => match skill {
            Some(s) => format!("in progress: {tech}, {}/{} started", s.seen, s.total),
            None => format!("in progress: {tech}"),
        },
        Some(Reason::NewTopic) => format!("new topic: {tech}"),
        Some(Reason::ColdRedo) => format!("cold redo: last solved {days_ago} days ago"),
        Some(Reason::KeepSharp) => format!("keep sharp: {tech} has been shaky"),
        Some(Reason::InterviewMix) => format!("interview mix: {tech}"),
        None => String::new(),
    }
}

/// Modules the diagnostic or the latest check-in found weak, each with what flagged it
/// ("diagnostic" or "check-in"); a check-in overrides the diagnostic.
pub(crate) fn weak_modules(events: &[Event]) -> HashMap<String, &'static str> {
    let mut out = HashMap::new();
    if let Some(r) = placement::load(events).filter(|r| !r.skipped) {
        out.extend(
            placement::weak_modules(&r)
                .into_iter()
                .map(|m| (m, "diagnostic")),
        );
    }
    if let Some(r) = checkpoint::load(events) {
        out.extend(
            checkpoint::weak_modules(&r)
                .into_iter()
                .map(|m| (m, "check-in")),
        );
    }
    out
}

struct Candidate<'a> {
    unseen: Vec<&'a Problem>,
    reason: Reason,
    struggle: f64,
}

fn pick_new<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    slots: u32,
    weak_mods: &HashMap<String, &'static str>,
    report: &Report,
) -> Vec<Item<'a>> {
    let (mut started, mut untouched, mut placed) = (Vec::new(), Vec::new(), Vec::new());
    for (mi, m) in c.modules.iter().enumerate().filter(|(_, m)| !m.bank) {
        for (ti, t) in m.techniques.iter().enumerate() {
            let skill = report.get(mi, ti);
            let mut cand = Candidate {
                unseen: vec![],
                reason: Reason::NewTopic,
                struggle: 0.0,
            };
            let (mut attempts, mut clean, mut seen) = (0, 0, false);
            for &i in &t.problems {
                let p = &c.problems()[i];
                match states.get(&p.id).filter(|st| st.status != Status::Unseen) {
                    None => cand.unseen.push(p),
                    Some(st) => {
                        seen = true;
                        attempts += st.attempts;
                        clean += st.clean_passes;
                    }
                }
            }
            if cand.unseen.is_empty() {
                continue;
            }
            if !seen {
                if weak_mods.contains_key(&m.id) {
                    cand.reason = Reason::Weak;
                    cand.struggle = 1.0;
                    placed.push(cand);
                } else {
                    untouched.push(cand);
                }
                continue;
            }
            if attempts > 0 {
                cand.struggle = f64::from(attempts.saturating_sub(clean)) / f64::from(attempts);
            }
            // The skill model knows recency, help and speed; the raw ratio is the fallback.
            let mut weak = cand.struggle >= WEAK_SHARE;
            if let Some(s) = skill.filter(|s| s.evidence.attempts > 0) {
                cand.struggle = 1.0 - s.mastery;
                weak = s.weak();
                // Easier problems first while warming up.
                cand.unseen = s.unseen.iter().map(|&i| &c.problems()[i]).collect();
            }
            cand.reason = if weak {
                Reason::Weak
            } else {
                Reason::InProgress
            };
            started.push(cand);
        }
    }
    started.sort_by(|a, b| b.struggle.total_cmp(&a.struggle));
    placed.sort_by(|a, b| b.struggle.total_cmp(&a.struggle));
    let order: Vec<Candidate> = placed.into_iter().chain(started).chain(untouched).collect();

    let slots = slots as usize;
    let mut out = Vec::new();
    for round in 0.. {
        if out.len() >= slots {
            break;
        }
        let mut added = false;
        for cand in &order {
            if let Some(&p) = cand.unseen.get(round)
                && out.len() < slots
            {
                out.push(Item {
                    problem: p,
                    kind: Kind::New,
                    state: State::default(),
                    overdue_days: 0,
                    reason: Some(cand.reason),
                    why: String::new(),
                });
                added = true;
            }
        }
        if !added {
            break;
        }
    }
    out
}

struct SharpCand<'a> {
    p: &'a Problem,
    st: State,
    score: f64,
    reason: Reason,
    today: bool,
}

fn pick_keep_sharp<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    today: Date,
    tz: &TimeZone,
    slots: usize,
) -> Vec<Item<'a>> {
    if slots == 0 {
        return vec![];
    }
    let day = midnight(today, tz);
    let mut primary = Vec::new();
    let mut today_done = Vec::new();
    for p in c.curriculum() {
        let Some(st) = states.get(&p.id).filter(|st| st.status != Status::Unseen) else {
            continue;
        };
        if is_due(st, day) {
            continue; // due reviews belong in the normal queue
        }
        let last = st.last_finished.map(|t| local_day(t, tz));
        let days_ago = last.map_or(0, |l| days_between(l, today));
        let struggle = if st.attempts > 0 {
            f64::from(st.attempts.saturating_sub(st.clean_passes)) / f64::from(st.attempts)
        } else {
            0.0
        };
        let mut reason = Reason::InterviewMix;
        let mut score = days_ago as f64 + struggle * 8.0;
        if days_ago >= COLD_DAYS {
            reason = Reason::ColdRedo;
            score += 6.0;
        } else if struggle >= WEAK_SHARE || st.fails > 0 {
            reason = Reason::KeepSharp;
            score += 4.0;
        }
        // Slight preference for medium, the usual interview difficulty.
        if p.difficulty == Difficulty::Medium {
            score += 1.0;
        }
        let cand = SharpCand {
            p,
            st: st.clone(),
            score,
            reason,
            today: last == Some(today),
        };
        if cand.today {
            today_done.push(cand);
        } else {
            primary.push(cand);
        }
    }
    if primary.is_empty() {
        primary = today_done;
    }
    primary.sort_by(|a, b| b.score.total_cmp(&a.score).then(a.p.order.cmp(&b.p.order)));

    let mut out = Vec::new();
    let mut used_tech = HashSet::new();
    let mut taken = HashSet::new();
    let mut add = |cand: &SharpCand<'a>| {
        if out.len() < slots && taken.insert(cand.p.id.as_str()) {
            out.push(Item {
                problem: cand.p,
                kind: Kind::Practice,
                state: cand.st.clone(),
                overdue_days: 0,
                reason: Some(cand.reason),
                why: String::new(),
            });
        }
    };
    for cand in &primary {
        if used_tech.insert((cand.p.module, cand.p.technique)) {
            add(cand);
        }
    }
    for cand in &primary {
        add(cand);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::checkpoint;
    use crate::placement;
    use crate::progress::{kind, mode};
    use crate::testutil::{chicago, day, event, good_catalog, midnight as mid};
    use jiff::SignedDuration;

    fn summary(items: &[Item]) -> String {
        items
            .iter()
            .map(|it| format!("{}:{}", it.kind.as_str(), it.problem.id))
            .collect::<Vec<_>>()
            .join(",")
    }

    fn new_ids(items: &[Item]) -> Vec<String> {
        items
            .iter()
            .filter(|it| it.kind == Kind::New)
            .map(|it| it.problem.id.clone())
            .collect()
    }

    fn st(status: Status, rung: i32, due: Timestamp) -> State {
        State {
            status,
            rung,
            due: Some(due),
            ..State::default()
        }
    }

    fn queue<'a>(c: &'a Catalog, states: &HashMap<String, State>, n: u32) -> Vec<Item<'a>> {
        today(c, states, day(19), &chicago(), n, &[])
    }

    fn map(list: Vec<(&str, State)>) -> HashMap<String, State> {
        list.into_iter().map(|(k, v)| (k.to_string(), v)).collect()
    }

    #[test]
    fn today_skips_unseen_bank_problems() {
        let c = good_catalog();
        let got = summary(&queue(&c, &HashMap::new(), 10));
        assert!(
            !got.contains("logger-rate-limiter"),
            "bank problems are never offered as new: {got}"
        );
        let states = map(vec![(
            "logger-rate-limiter",
            st(Status::Learning, 0, mid(19)),
        )]);
        assert_eq!(
            summary(&queue(&c, &states, 0)),
            "review:logger-rate-limiter",
            "a due bank problem is still reviewed"
        );
    }

    #[test]
    fn today_orders_reviews_then_new() {
        let c = good_catalog();
        let states = map(vec![
            ("p-two", st(Status::Learning, 0, mid(19))),
            ("p-three", st(Status::Reviewing, 2, mid(15))),
            ("two-sum", st(Status::Learning, 1, mid(22))),
        ]);
        let items = queue(&c, &states, 3);
        assert_eq!(summary(&items), "review:p-three,review:p-two,new:p-one");
        assert_eq!((items[0].overdue_days, items[1].overdue_days), (4, 0));
    }

    #[test]
    fn today_new_slots_shrink_after_starting_new() {
        let c = good_catalog();
        let states = map(vec![(
            "p-one",
            State {
                first_finished: Some(day(19) - SignedDuration::from_hours(1)),
                ..st(Status::Learning, 0, mid(20))
            },
        )]);
        assert_eq!(summary(&queue(&c, &states, 3)), "new:p-two,new:p-three");
        // Daily new slots are used up, but keep-sharp still offers a drill so Today is never a dead end.
        assert_eq!(summary(&queue(&c, &states, 1)), "practice:p-one");
    }

    #[test]
    fn today_keep_sharp_when_caught_up() {
        let c = good_catalog();
        let drill = |status, rung, attempts, clean, fails, last: i8, due: i8| State {
            attempts,
            clean_passes: clean,
            fails,
            last_finished: Some(day(last)),
            ..st(status, rung, mid(due))
        };
        let states = map(vec![
            ("p-one", drill(Status::Mastered, 3, 4, 4, 0, 5, 25)),
            ("p-two", drill(Status::Mastered, 3, 5, 2, 2, 12, 25)),
            ("p-three", drill(Status::Reviewing, 2, 3, 3, 0, 1, 30)),
            ("two-sum", drill(Status::Mastered, 4, 2, 2, 0, 10, 28)),
        ]);
        let items = queue(&c, &states, 3);
        assert_eq!(
            items.len(),
            3,
            "want 3 keep-sharp drills, got {}",
            summary(&items)
        );
        assert!(
            items.iter().all(|it| it.kind == Kind::Practice),
            "keep-sharp items should be practice: {}",
            summary(&items)
        );
        let techs: HashSet<_> = items
            .iter()
            .map(|it| c.technique_of(it.problem).title.as_str())
            .collect();
        assert!(
            techs.len() >= 2,
            "drills should spread techniques, got {}",
            summary(&items)
        );
        // Cold / shaky work should surface with a keep-sharp reason, not "new topic".
        for it in &items {
            assert!(
                matches!(
                    it.reason,
                    Some(Reason::KeepSharp | Reason::ColdRedo | Reason::InterviewMix)
                ),
                "unexpected reason {:?} on {}",
                it.reason,
                it.problem.id
            );
        }
    }

    #[test]
    fn today_ignores_unknown_ids() {
        let c = good_catalog();
        let states = map(vec![("deleted-problem", st(Status::Learning, 0, mid(1)))]);
        assert_eq!(summary(&queue(&c, &states, 0)), "");
    }

    #[test]
    fn new_starts_one_per_technique_in_reading_order() {
        let c = good_catalog();
        assert_eq!(
            new_ids(&queue(&c, &HashMap::new(), 3)),
            ["p-one", "p-three", "two-sum"],
            "a fresh start samples one problem per technique"
        );
    }

    #[test]
    fn new_prefers_started_techniques_you_struggle_with() {
        let c = good_catalog();
        let tried = |attempts, clean| State {
            attempts,
            clean_passes: clean,
            ..st(Status::Learning, 0, mid(25))
        };
        let states = map(vec![
            // technique "one" is started and shaky: 3 attempts, none clean
            ("p-one", tried(3, 0)),
            // technique "three" is finished cleanly
            (
                "two-sum",
                State {
                    rung: 1,
                    ..tried(1, 1)
                },
            ),
        ]);
        assert_eq!(
            new_ids(&queue(&c, &states, 2)),
            ["p-two", "p-three"],
            "started, shaky techniques come first, then untouched ones"
        );
    }

    #[test]
    fn new_prefers_modules_from_placement() {
        let c = good_catalog();
        let events = [event(
            day(1),
            kind::PLACEMENT_DONE,
            mode::PLACEMENT,
            placement::encode(&[placement::ItemResult {
                topic: "beta".into(),
                problem_id: "two-sum".into(),
                module_id: "beta".into(),
                outcome: placement::Outcome::Failed,
                level: placement::Level::StartHere,
            }]),
        )];
        let tz = chicago();
        let none = HashMap::new();
        assert_eq!(
            new_ids(&today(&c, &none, day(19), &tz, 3, &events)),
            ["two-sum", "p-one", "p-three"],
            "placement weak modules should lead"
        );
        assert_eq!(
            today(&c, &none, day(19), &tz, 1, &events)[0].reason,
            Some(Reason::Weak),
            "placement-boosted problems should be labeled weak spot"
        );
        let why = &today(&c, &none, day(19), &tz, 1, &events)[0].why;
        assert!(
            why.starts_with("weak spot: your diagnostic flagged"),
            "names the diagnostic, not a check-in: {why}"
        );
    }

    #[test]
    fn new_prefers_modules_from_checkpoint() {
        let c = good_catalog();
        let events = [event(
            day(1),
            kind::CHECKPOINT_DONE,
            mode::CHECKPOINT,
            checkpoint::encode(
                2,
                &[checkpoint::ItemResult {
                    topic: "Beta".into(),
                    problem_id: "two-sum".into(),
                    module_id: "beta".into(),
                    outcome: checkpoint::Outcome::Failed,
                    level: checkpoint::Level::StartHere,
                }],
            ),
        )];
        assert_eq!(
            new_ids(&today(&c, &HashMap::new(), day(19), &chicago(), 3, &events)),
            ["two-sum", "p-one", "p-three"],
            "checkpoint weak modules should lead"
        );
        let why = &today(&c, &HashMap::new(), day(19), &chicago(), 1, &events)[0].why;
        assert!(why.starts_with("weak spot: your check-in flagged"), "{why}");
    }
}
