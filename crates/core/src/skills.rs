//! The skill model: how well the learner knows each technique, how sure we are, which
//! way it is heading, why it is weak, and what to do about it. Today and the planner
//! both pick work from it, and every recommendation carries a reason in plain words.

use std::collections::HashMap;

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};
use serde::{Deserialize, Serialize};

use crate::catalog::{Catalog, Difficulty, Problem};
use crate::progress::{Event, kind};
use crate::schedule::{self, Attempt, Outcome, RUNGS, State, Status, local_day};

/// Evidence this many days old counts half as much as today's.
const HALF_LIFE_DAYS: f64 = 21.0;
/// Weighted attempts at which confidence reaches one half.
const CONFIDENCE_K: f64 = 3.0;
/// Share of mastery from attempt evidence; the rest is the review ladder.
const EVIDENCE_SHARE: f64 = 0.75;
/// Below this mastery a practised technique is a weak spot.
pub const WEAK_MASTERY: f64 = 0.7;
/// Below this confidence the planner warms up with easier problems first.
pub const LOW_CONFIDENCE: f64 = 0.5;
/// Attempts before a weakness gets a cause.
const CAUSE_MIN_ATTEMPTS: u32 = 2;
const TREND_MIN_ATTEMPTS: usize = 4;
const TREND_DELTA: f64 = 0.15;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Cause {
    CantStart,
    WrongApproach,
    EdgeCases,
    TooSlow,
    Forgetting,
}

impl Cause {
    pub fn as_str(self) -> &'static str {
        match self {
            Cause::CantStart => "can't start",
            Cause::WrongApproach => "wrong approach",
            Cause::EdgeCases => "edge cases",
            Cause::TooSlow => "too slow",
            Cause::Forgetting => "forgetting",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Trend {
    Improving,
    Flat,
    Slipping,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionKind {
    /// Re-read the technique's note before the next problem.
    ReadNote,
    /// An easier unseen problem of the technique first.
    Warmup,
    /// Redo a problem that failed on a few tests.
    EdgeCaseRedo,
    /// Redo a problem that passed over its time target, against the clock.
    TimedRep,
    /// Redo a problem that slipped after an earlier pass.
    SpacedRedo,
    /// The next unseen problem in reading order.
    Next,
}

#[derive(Debug, Clone)]
pub struct Action {
    pub kind: ActionKind,
    /// Index into `Catalog::problems`.
    pub problem: Option<usize>,
    pub note: Option<String>,
    pub reason: String,
}

/// Raw counts behind a skill; the labels count attempts by their likely cause.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct Evidence {
    pub attempts: u32,
    pub passes: u32,
    pub clean: u32,
    pub fails: u32,
    pub hinted: u32,
    pub peeked: u32,
    pub gave_up: u32,
    pub restarted: u32,
    pub cant_start: u32,
    pub wrong_approach: u32,
    pub edge_cases: u32,
    pub too_slow: u32,
    pub forgot: u32,
}

#[derive(Debug, Clone)]
pub struct Skill {
    pub module: usize,
    pub technique: usize,
    /// 0 to 1; 0 with no evidence.
    pub mastery: f64,
    /// 0 to 1, growing with recent attempts.
    pub confidence: f64,
    pub trend: Option<Trend>,
    pub cause: Option<Cause>,
    pub evidence: Evidence,
    pub seen: usize,
    pub total: usize,
    /// Unseen problems in the order to start them: easier first while warming up.
    pub unseen: Vec<usize>,
    pub actions: Vec<Action>,
}

impl Skill {
    /// How much the learner needs this technique: low mastery we are sure of ranks
    /// above low mastery we have not measured.
    pub fn need(&self) -> f64 {
        (1.0 - self.mastery) * (0.5 + 0.5 * self.confidence)
    }

    pub fn weak(&self) -> bool {
        self.evidence.attempts > 0 && self.mastery < WEAK_MASTERY
    }

    pub fn warming_up(&self) -> bool {
        self.evidence.attempts > 0
            && (self.confidence < LOW_CONFIDENCE
                || matches!(self.cause, Some(Cause::CantStart | Cause::WrongApproach)))
    }

    /// "fails 3/5 (wrong approach)" style evidence for reasons.
    pub fn struggle_text(&self) -> String {
        let e = &self.evidence;
        let missed = e.attempts - e.clean;
        let cause = self
            .cause
            .map_or(String::new(), |c| format!(", {}", c.as_str()));
        format!("{missed}/{} not clean{cause}", e.attempts)
    }
}

#[derive(Debug, Clone)]
pub struct ModuleSkill {
    pub module: usize,
    pub mastery: f64,
    pub confidence: f64,
}

#[derive(Debug, Default)]
pub struct Report {
    /// Curriculum techniques in reading order (bank modules excluded).
    pub techniques: Vec<Skill>,
    pub modules: Vec<ModuleSkill>,
    index: HashMap<(usize, usize), usize>,
}

impl Report {
    pub fn get(&self, module: usize, technique: usize) -> Option<&Skill> {
        self.index
            .get(&(module, technique))
            .map(|&i| &self.techniques[i])
    }

    pub fn of(&self, p: &Problem) -> Option<&Skill> {
        self.get(p.module, p.technique)
    }
}

/// Test results of one attempt: the best run, by share of tests passed.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Runs {
    pub runs: u32,
    pub best_passed: u32,
    pub best_total: u32,
}

fn runs_by_attempt(events: &[Event]) -> HashMap<&str, Runs> {
    let mut out: HashMap<&str, Runs> = HashMap::new();
    for e in events.iter().filter(|e| e.kind == kind::TEST_RUN) {
        let r = out.entry(e.attempt.as_str()).or_default();
        r.runs += 1;
        let num = |k: &str| e.data.get(k).and_then(|v| v.parse::<u32>().ok());
        let (Some(passed), Some(total)) = (num("passed"), num("total")) else {
            continue;
        };
        // passed/total > best_passed/best_total, without floats
        if total > 0
            && u64::from(passed) * u64::from(r.best_total.max(1))
                >= u64::from(r.best_passed) * u64::from(total)
        {
            r.best_passed = passed;
            r.best_total = total;
        }
    }
    out
}

fn target_of(p: &Problem) -> SignedDuration {
    SignedDuration::try_from(p.time_target).unwrap_or(SignedDuration::ZERO)
}

/// The likely cause of one non-clean attempt; `None` for a clean pass.
pub fn classify(a: &Attempt, target: SignedDuration, r: Runs) -> Option<Cause> {
    match a.outcome {
        Outcome::Fail if r.runs == 0 || r.best_passed == 0 => Some(Cause::CantStart),
        Outcome::Fail if r.best_total > 0 && r.best_passed * 2 >= r.best_total => {
            Some(Cause::EdgeCases)
        }
        Outcome::Fail => Some(Cause::WrongApproach),
        Outcome::Pass if a.hints > 0 || a.peeks > 0 => Some(Cause::WrongApproach),
        Outcome::Pass if a.elapsed >= target => Some(Cause::TooSlow),
        _ => None,
    }
}

/// 1 for a clean pass, partial credit for help or slowness, a little for a near miss.
pub fn score(a: &Attempt, target: SignedDuration, r: Runs) -> f64 {
    if a.outcome != Outcome::Pass {
        return if r.best_total > 0 {
            0.25 * f64::from(r.best_passed) / f64::from(r.best_total)
        } else {
            0.0
        };
    }
    let mut s = 1.0;
    if a.hints > 0 {
        s -= 0.25 + 0.1 * f64::from(a.hints - 1);
    }
    if a.peeks > 0 {
        s -= 0.4;
    }
    if a.restarts > 0 {
        s -= 0.1;
    }
    if a.elapsed >= target {
        s -= 0.2;
    }
    f64::max(s, 0.1)
}

struct Scored<'a> {
    a: &'a Attempt,
    p: &'a Problem,
    weight: f64,
    score: f64,
    label: Option<Cause>,
    forgot: bool,
    runs: Runs,
}

fn mins(d: SignedDuration) -> i64 {
    (d.as_secs() + 59) / 60
}

fn difficulty_rank(d: Difficulty) -> u8 {
    match d {
        Difficulty::Easy => 0,
        Difficulty::Medium => 1,
        Difficulty::Hard => 2,
    }
}

pub fn assess(
    c: &Catalog,
    events: &[Event],
    states: &HashMap<String, State>,
    now: Timestamp,
    tz: &TimeZone,
) -> Report {
    let target = |id: &str| c.problem(id).map_or(SignedDuration::ZERO, target_of);
    let attempts = schedule::attempts(events, target);
    let runs = runs_by_attempt(events);
    let mut finished: Vec<&Attempt> = attempts
        .iter()
        .filter(|a| a.outcome != Outcome::None && a.end.is_some())
        .collect();
    finished.sort_by_key(|a| a.end);

    let mut first_pass = HashMap::new();
    let mut by_tech: HashMap<(usize, usize), Vec<Scored>> = HashMap::new();
    for a in finished {
        let Some(p) = c.problem(&a.problem) else {
            continue;
        };
        let end = a.end.expect("filtered");
        let day = local_day(end, tz);
        let forgot = !a.clean && first_pass.get(p.id.as_str()).is_some_and(|d| *d < day);
        if a.outcome == Outcome::Pass {
            first_pass.entry(p.id.as_str()).or_insert(day);
        }
        let r = runs.get(a.id.as_str()).copied().unwrap_or_default();
        let age_days = (now.as_second() - end.as_second()).max(0) as f64 / 86_400.0;
        let t = target_of(p);
        by_tech
            .entry((p.module, p.technique))
            .or_default()
            .push(Scored {
                a,
                p,
                weight: 0.5f64.powf(age_days / HALF_LIFE_DAYS),
                score: score(a, t, r),
                label: classify(a, t, r),
                forgot,
                runs: r,
            });
    }

    let mut report = Report::default();
    for (mi, m) in c.modules.iter().enumerate().filter(|(_, m)| !m.bank) {
        let (mut w_sum, mut m_sum) = (0.0, 0.0);
        for (ti, t) in m.techniques.iter().enumerate() {
            let scored = by_tech.remove(&(mi, ti)).unwrap_or_default();
            let skill = build(c, mi, ti, t.note.as_ref(), &t.problems, &scored, states);
            w_sum += skill.confidence;
            m_sum += skill.mastery * skill.confidence;
            report.index.insert((mi, ti), report.techniques.len());
            report.techniques.push(skill);
        }
        let n = m.techniques.len().max(1) as f64;
        report.modules.push(ModuleSkill {
            module: mi,
            mastery: if w_sum > 0.0 { m_sum / w_sum } else { 0.0 },
            confidence: w_sum / n,
        });
    }
    report
}

fn build(
    c: &Catalog,
    module: usize,
    technique: usize,
    note: Option<&std::path::PathBuf>,
    problems: &[usize],
    scored: &[Scored],
    states: &HashMap<String, State>,
) -> Skill {
    let mut e = Evidence::default();
    let mut tally: HashMap<Cause, f64> = HashMap::new();
    let (mut w_sum, mut s_sum) = (0.0, 0.0);
    for s in scored {
        let a = s.a;
        e.attempts += 1;
        e.passes += u32::from(a.outcome == Outcome::Pass);
        e.fails += u32::from(a.outcome == Outcome::Fail);
        e.clean += u32::from(a.clean);
        e.hinted += u32::from(a.hints > 0);
        e.peeked += u32::from(a.peeks > 0);
        e.restarted += u32::from(a.restarts > 0);
        e.gave_up += u32::from(a.outcome == Outcome::Fail && s.runs.runs == 0);
        match s.label {
            Some(Cause::CantStart) => e.cant_start += 1,
            Some(Cause::WrongApproach) => e.wrong_approach += 1,
            Some(Cause::EdgeCases) => e.edge_cases += 1,
            Some(Cause::TooSlow) => e.too_slow += 1,
            Some(Cause::Forgetting) | None => {}
        }
        if let Some(l) = s.label {
            *tally.entry(l).or_default() += s.weight;
        }
        if s.forgot {
            e.forgot += 1;
            *tally.entry(Cause::Forgetting).or_default() += s.weight;
        }
        w_sum += s.weight;
        s_sum += s.weight * s.score;
    }

    let (mut seen, mut ladder) = (0usize, 0.0);
    let mut unseen = Vec::new();
    for &i in problems {
        match states
            .get(&c.problems()[i].id)
            .filter(|st| st.status != Status::Unseen)
        {
            Some(st) => {
                seen += 1;
                ladder += f64::from(st.rung + 1) / RUNGS.len() as f64;
            }
            None => unseen.push(i),
        }
    }
    let mastery = if w_sum > 0.0 {
        let ladder = if seen > 0 { ladder / seen as f64 } else { 0.0 };
        EVIDENCE_SHARE * (s_sum / w_sum) + (1.0 - EVIDENCE_SHARE) * ladder
    } else {
        0.0
    };
    let confidence = w_sum / (w_sum + CONFIDENCE_K);

    let cause = if e.attempts >= CAUSE_MIN_ATTEMPTS && mastery < WEAK_MASTERY {
        // Ties go to the earlier cause: forgetting first, slowness last.
        [
            Cause::Forgetting,
            Cause::CantStart,
            Cause::WrongApproach,
            Cause::EdgeCases,
            Cause::TooSlow,
        ]
        .into_iter()
        .filter_map(|cause| tally.get(&cause).map(|w| (cause, *w)))
        .fold(None, |best: Option<(Cause, f64)>, (cause, w)| match best {
            Some((_, bw)) if bw >= w => best,
            _ => Some((cause, w)),
        })
        .map(|(cause, _)| cause)
    } else {
        None
    };

    let trend = (scored.len() >= TREND_MIN_ATTEMPTS).then(|| {
        let half = scored.len() / 2;
        let mean = |xs: &[Scored]| xs.iter().map(|s| s.score).sum::<f64>() / xs.len() as f64;
        let (old, new) = scored.split_at(scored.len() - half);
        match mean(new) - mean(old) {
            d if d >= TREND_DELTA => Trend::Improving,
            d if d <= -TREND_DELTA => Trend::Slipping,
            _ => Trend::Flat,
        }
    });

    let mut skill = Skill {
        module,
        technique,
        mastery,
        confidence,
        trend,
        cause,
        evidence: e,
        seen,
        total: problems.len(),
        unseen,
        actions: Vec::new(),
    };
    if skill.warming_up() {
        skill.unseen.sort_by_key(|&i| {
            let p = &c.problems()[i];
            (difficulty_rank(p.difficulty), p.order)
        });
    }
    skill.actions = actions(c, &skill, note, scored);
    skill
}

fn latest<'s, 'a>(scored: &'s [Scored<'a>], f: impl Fn(&Scored) -> bool) -> Option<&'s Scored<'a>> {
    scored.iter().rev().find(|s| f(s))
}

fn actions(
    c: &Catalog,
    s: &Skill,
    note: Option<&std::path::PathBuf>,
    scored: &[Scored],
) -> Vec<Action> {
    let tech = &c.modules[s.module].techniques[s.technique].title;
    let e = &s.evidence;
    let act = |kind, problem: Option<usize>, reason: String| Action {
        kind,
        problem,
        note: None,
        reason,
    };
    let mut out = Vec::new();
    match s.cause {
        Some(cause @ (Cause::CantStart | Cause::WrongApproach)) => {
            if let Some(path) = note {
                let why = if cause == Cause::CantStart {
                    format!(
                        "{} of {} attempts stalled before a test passed",
                        e.cant_start, e.attempts
                    )
                } else {
                    format!(
                        "{} of {} attempts needed hints or missed the approach",
                        e.wrong_approach, e.attempts
                    )
                };
                out.push(Action {
                    kind: ActionKind::ReadNote,
                    problem: None,
                    note: Some(path.to_string_lossy().replace('\\', "/")),
                    reason: format!("re-read the {tech} note: {why}"),
                });
            }
        }
        Some(Cause::EdgeCases) => {
            if let Some(x) = latest(scored, |x| x.label == Some(Cause::EdgeCases)) {
                out.push(act(
                    ActionKind::EdgeCaseRedo,
                    Some(x.p.order),
                    format!(
                        "edge cases: {} passed {}/{} tests; redo it and list the edge cases first",
                        x.p.title, x.runs.best_passed, x.runs.best_total
                    ),
                ));
            }
        }
        Some(Cause::TooSlow) => {
            if let Some(x) = latest(scored, |x| x.label == Some(Cause::TooSlow)) {
                out.push(act(
                    ActionKind::TimedRep,
                    Some(x.p.order),
                    format!(
                        "timed rep: {} took {} min, target {} min",
                        x.p.title,
                        mins(x.a.elapsed),
                        mins(target_of(x.p))
                    ),
                ));
            }
        }
        Some(Cause::Forgetting) => {
            if let Some(x) = latest(scored, |x| x.forgot) {
                out.push(act(
                    ActionKind::SpacedRedo,
                    Some(x.p.order),
                    format!("spaced redo: {} slipped after you had passed it", x.p.title),
                ));
            }
        }
        None => {}
    }
    if let Some(&first) = s.unseen.first() {
        let p = &c.problems()[first];
        if s.warming_up() {
            out.push(act(
                ActionKind::Warmup,
                Some(first),
                format!(
                    "warm-up: the easiest unseen {tech} problem ({}) first, confidence {:.0}%",
                    p.difficulty.as_str(),
                    s.confidence * 100.0
                ),
            ));
        } else if s.cause.is_none() {
            out.push(act(
                ActionKind::Next,
                Some(first),
                format!("next in {tech}"),
            ));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::progress::mode;
    use crate::testutil::{chicago, good_catalog};

    fn at(day: i8, hour: i8) -> Timestamp {
        jiff::civil::date(2026, 10, day)
            .at(hour, 0, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp()
    }

    fn ev(t: Timestamp, k: &str, p: &str, id: &str, data: &[(&str, &str)]) -> Event {
        Event {
            time: t,
            kind: k.into(),
            problem: p.into(),
            attempt: id.into(),
            mode: mode::PRACTICE.into(),
            data: data
                .iter()
                .map(|(a, b)| (a.to_string(), b.to_string()))
                .collect::<BTreeMap<_, _>>(),
        }
    }

    /// (minute offset, kind, data)
    type Step<'a> = (i64, &'a str, &'a [(&'a str, &'a str)]);

    /// One attempt made of `steps`.
    fn att(p: &str, id: &str, start: Timestamp, steps: &[Step]) -> Vec<Event> {
        let mut out = vec![ev(start, kind::OPENED, p, id, &[])];
        for (m, k, d) in steps {
            let t = start + SignedDuration::from_mins(*m);
            let mut data: Vec<(&str, &str)> = d.to_vec();
            let ms = (m * 60_000).to_string();
            if *k == kind::PASSED {
                data.push(("elapsed_ms", ms.as_str()));
            }
            out.push(ev(t, k, p, id, &data));
        }
        out
    }

    fn report(events: &[Event], now: Timestamp) -> (Catalog, Report) {
        let c = good_catalog();
        let target = |id: &str| c.problem(id).map_or(SignedDuration::ZERO, target_of);
        let states = schedule::compute(events, target, &chicago());
        let r = assess(&c, events, &states, now, &chicago());
        (c, r)
    }

    // technique "one" of module alpha holds p-one (easy, 15m) and p-two (medium, 20m)
    fn one(r: &Report) -> &Skill {
        r.get(0, 0).unwrap()
    }

    const RUN0: &[(&str, &str)] = &[("passed", "0"), ("total", "8")];
    const RUN7: &[(&str, &str)] = &[("passed", "7"), ("total", "8")];
    const RUN2: &[(&str, &str)] = &[("passed", "2"), ("total", "8")];
    const RUN8: &[(&str, &str)] = &[("passed", "8"), ("total", "8")];

    #[test]
    fn no_history_is_unmeasured() {
        let (_, r) = report(&[], at(20, 12));
        let s = one(&r);
        assert_eq!(
            (s.mastery, s.confidence, s.cause, s.trend),
            (0.0, 0.0, None, None)
        );
        assert_eq!(s.actions[0].kind, ActionKind::Next);
        assert!(!s.weak());
    }

    #[test]
    fn gave_up_without_runs_is_cant_start() {
        let events = [
            att("p-one", "a1", at(1, 10), &[(5, kind::GAVE_UP, &[])]),
            att(
                "p-two",
                "a2",
                at(2, 10),
                &[(3, kind::TEST_RUN, RUN0), (6, kind::GAVE_UP, &[])],
            ),
        ]
        .concat();
        let (_, r) = report(&events, at(3, 12));
        let s = one(&r);
        assert_eq!(s.cause, Some(Cause::CantStart));
        assert_eq!(s.evidence.cant_start, 2);
        assert!(s.weak());
        assert_eq!(s.actions[0].kind, ActionKind::ReadNote);
        assert!(
            s.actions[0].reason.contains("2 of 2 attempts stalled"),
            "{}",
            s.actions[0].reason
        );
    }

    #[test]
    fn near_miss_fails_are_edge_cases() {
        let events = [
            att(
                "p-one",
                "a1",
                at(1, 10),
                &[(9, kind::TEST_RUN, RUN7), (10, kind::GAVE_UP, &[])],
            ),
            att(
                "p-two",
                "a2",
                at(2, 10),
                &[(9, kind::TEST_RUN, RUN7), (12, kind::GAVE_UP, &[])],
            ),
        ]
        .concat();
        let (c, r) = report(&events, at(3, 12));
        let s = one(&r);
        assert_eq!(s.cause, Some(Cause::EdgeCases));
        let a = &s.actions[0];
        assert_eq!(a.kind, ActionKind::EdgeCaseRedo);
        assert_eq!(c.problems()[a.problem.unwrap()].id, "p-two");
        assert!(a.reason.contains("7/8 tests"), "{}", a.reason);
    }

    #[test]
    fn hints_and_low_pass_rate_are_wrong_approach() {
        let events = [
            att(
                "p-one",
                "a1",
                at(1, 10),
                &[(3, kind::HINT_REVEALED, &[]), (8, kind::PASSED, &[])],
            ),
            att(
                "p-two",
                "a2",
                at(2, 10),
                &[(20, kind::TEST_RUN, RUN2), (25, kind::GAVE_UP, &[])],
            ),
        ]
        .concat();
        let (_, r) = report(&events, at(3, 12));
        let s = one(&r);
        assert_eq!(s.cause, Some(Cause::WrongApproach));
        assert_eq!((s.evidence.wrong_approach, s.evidence.hinted), (2, 1));
        assert_eq!(s.actions[0].kind, ActionKind::ReadNote);
    }

    #[test]
    fn passes_over_target_are_too_slow() {
        // p-one's target is 15 min, p-two's 20.
        let events = [
            att(
                "p-one",
                "a1",
                at(1, 10),
                &[(10, kind::TEST_RUN, RUN8), (30, kind::PASSED, &[])],
            ),
            att("p-two", "a2", at(2, 10), &[(40, kind::PASSED, &[])]),
        ]
        .concat();
        let (c, r) = report(&events, at(3, 12));
        let s = one(&r);
        assert_eq!(s.cause, Some(Cause::TooSlow), "mastery {}", s.mastery);
        let a = &s.actions[0];
        assert_eq!(a.kind, ActionKind::TimedRep);
        assert_eq!(c.problems()[a.problem.unwrap()].id, "p-two");
        assert!(
            a.reason.contains("took 40 min, target 20 min"),
            "{}",
            a.reason
        );
    }

    #[test]
    fn failing_a_passed_problem_later_is_forgetting() {
        let events = [
            att("p-one", "a1", at(1, 10), &[(5, kind::PASSED, &[])]),
            att(
                "p-one",
                "a2",
                at(8, 10),
                &[(10, kind::TEST_RUN, RUN2), (12, kind::GAVE_UP, &[])],
            ),
            att(
                "p-one",
                "a3",
                at(9, 10),
                &[(10, kind::TEST_RUN, RUN0), (11, kind::GAVE_UP, &[])],
            ),
        ]
        .concat();
        let (c, r) = report(&events, at(10, 12));
        let s = one(&r);
        assert_eq!(s.evidence.forgot, 2);
        assert_eq!(s.cause, Some(Cause::Forgetting));
        assert_eq!(s.actions[0].kind, ActionKind::SpacedRedo);
        assert_eq!(c.problems()[s.actions[0].problem.unwrap()].id, "p-one");
    }

    #[test]
    fn clean_history_is_strong_and_confident() {
        let events: Vec<Event> = (1..=6)
            .flat_map(|d| {
                att(
                    if d % 2 == 0 { "p-one" } else { "p-two" },
                    &format!("a{d}"),
                    at(d, 10),
                    &[(5, kind::PASSED, &[])],
                )
            })
            .collect();
        let (_, r) = report(&events, at(7, 12));
        let s = one(&r);
        assert!(s.mastery > WEAK_MASTERY && s.confidence > 0.6, "{s:?}");
        assert_eq!((s.cause, s.trend), (None, Some(Trend::Flat)));
        assert!(s.need() < 0.25);
    }

    #[test]
    fn recent_evidence_outweighs_old_and_trend_follows() {
        let old_fails: Vec<Event> = (1..=3)
            .flat_map(|d| {
                att(
                    "p-one",
                    &format!("f{d}"),
                    at(d, 10),
                    &[(5, kind::GAVE_UP, &[])],
                )
            })
            .collect();
        let new_passes: Vec<Event> = (27..=29)
            .flat_map(|d| {
                att(
                    "p-two",
                    &format!("p{d}"),
                    at(d, 10),
                    &[(5, kind::PASSED, &[])],
                )
            })
            .collect();
        let (_, r) = report(&[old_fails, new_passes].concat(), at(30, 12));
        let s = one(&r);
        assert_eq!(s.trend, Some(Trend::Improving));
        assert!(s.mastery > 0.5, "recent passes dominate: {}", s.mastery);
    }

    #[test]
    fn low_confidence_warms_up_easier_first() {
        // One hinted pass on the medium problem: p-one (easy) comes next as a warm-up.
        let events = att(
            "p-two",
            "a1",
            at(1, 10),
            &[(2, kind::HINT_REVEALED, &[]), (9, kind::PASSED, &[])],
        );
        let (c, r) = report(&events, at(2, 12));
        let s = one(&r);
        assert!(s.warming_up());
        let w = s
            .actions
            .iter()
            .find(|a| a.kind == ActionKind::Warmup)
            .unwrap();
        assert_eq!(c.problems()[w.problem.unwrap()].id, "p-one");
    }

    #[test]
    fn classify_table() {
        let t = SignedDuration::from_mins(20);
        let base = crate::testutil::attempt("p", Outcome::Pass);
        let runs = |runs, best_passed, best_total| Runs {
            runs,
            best_passed,
            best_total,
        };
        let cases = [
            (Outcome::Fail, 0, 0, runs(0, 0, 0), Some(Cause::CantStart)),
            (Outcome::Fail, 0, 30, runs(2, 0, 5), Some(Cause::CantStart)),
            (Outcome::Fail, 0, 30, runs(2, 4, 5), Some(Cause::EdgeCases)),
            (
                Outcome::Fail,
                0,
                30,
                runs(2, 1, 5),
                Some(Cause::WrongApproach),
            ),
            (
                Outcome::Pass,
                1,
                5,
                runs(1, 5, 5),
                Some(Cause::WrongApproach),
            ),
            (Outcome::Pass, 0, 25, runs(1, 5, 5), Some(Cause::TooSlow)),
            (Outcome::Pass, 0, 5, runs(1, 5, 5), None),
        ];
        for (outcome, hints, m, r, want) in cases {
            let a = Attempt {
                outcome,
                hints,
                elapsed: SignedDuration::from_mins(m),
                ..base.clone()
            };
            assert_eq!(
                classify(&a, t, r),
                want,
                "{outcome:?} hints={hints} {m}m {r:?}"
            );
        }
    }

    #[test]
    fn best_run_wins() {
        let events = [
            ev(at(1, 10), kind::TEST_RUN, "p", "x", RUN2),
            ev(at(1, 11), kind::TEST_RUN, "p", "x", RUN7),
            ev(at(1, 12), kind::TEST_RUN, "p", "x", RUN0),
        ];
        assert_eq!(
            runs_by_attempt(&events)["x"],
            Runs {
                runs: 3,
                best_passed: 7,
                best_total: 8
            }
        );
    }
}
