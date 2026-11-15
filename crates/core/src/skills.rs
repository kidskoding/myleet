//! The skill model: how well the learner knows each technique, how sure we are, which
//! way it is heading, why it is weak, and what to do about it. Today and the planner
//! both pick work from it, and every recommendation carries a reason in plain words.

use std::collections::HashMap;

use jiff::civil::Date;
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
/// Confidence and the weak-spot call count attempts in this many recent days.
pub const RECENT_DAYS: i64 = 42;
/// Recent attempts before the model calls a weak spot; fewer is a first read.
pub const SURE_ATTEMPTS: u32 = 4;
/// Recent attempts at which a read is "sure" rather than "fairly sure".
pub const VERY_SURE_ATTEMPTS: u32 = 6;
/// Attempts kept per technique for the evidence strip.
pub const HISTORY: usize = 6;
/// Weeks of clean passes in the technique detail.
pub const WEEKS: usize = 6;

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
    /// How `n` attempts with this cause read in a sentence: "2 failed on edge cases".
    pub fn counted(self, n: u32) -> String {
        match self {
            Cause::CantStart => format!("{n} stalled before a test passed"),
            Cause::WrongApproach => format!("{n} needed a hint or a restart to find the approach"),
            Cause::EdgeCases => format!("{n} failed on edge cases"),
            Cause::TooSlow => format!("{n} ran over the time target"),
            Cause::Forgetting => format!("{n} slipped after an earlier clean pass"),
        }
    }

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

/// Mastery in words: New (no attempts), Shaky, Building, Solid, Strong.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    New,
    Shaky,
    Building,
    Solid,
    Strong,
}

impl Level {
    pub fn of(mastery: f64, attempts: u32) -> Level {
        match mastery {
            _ if attempts == 0 => Level::New,
            m if m < 0.35 => Level::Shaky,
            m if m < 0.65 => Level::Building,
            m if m < 0.85 => Level::Solid,
            _ => Level::Strong,
        }
    }

    pub fn word(self) -> &'static str {
        match self {
            Level::New => "New",
            Level::Shaky => "Shaky",
            Level::Building => "Building",
            Level::Solid => "Solid",
            Level::Strong => "Strong",
        }
    }
}

/// How sure the model is, from recent attempts: 1-3 first read, 4-5 fairly sure, 6+ sure.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Sureness {
    None,
    FirstRead,
    FairlySure,
    Sure,
}

impl Sureness {
    pub fn of(recent: u32) -> Sureness {
        match recent {
            0 => Sureness::None,
            n if n < SURE_ATTEMPTS => Sureness::FirstRead,
            n if n < VERY_SURE_ATTEMPTS => Sureness::FairlySure,
            _ => Sureness::Sure,
        }
    }
}

/// How one attempt went, for the evidence strip.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Mark {
    Clean,
    Missed,
    Hint,
    Over,
}

#[derive(Debug, Clone)]
pub struct AttemptMark {
    /// Index into `Catalog::problems`.
    pub problem: usize,
    pub day: Date,
    pub mark: Mark,
    pub cause: Option<Cause>,
    /// "passed 5 of 7 tests", "31 min against 25", "hint to start".
    pub detail: String,
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
    /// Button text: "Edge-case drill: Number of Enclaves".
    pub title: String,
    /// Minutes at the target pace.
    pub minutes: u32,
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
    /// Attempts in the last `RECENT_DAYS`.
    pub recent: u32,
    /// The last `HISTORY` attempts, oldest first.
    pub history: Vec<AttemptMark>,
    /// Clean passes per week, oldest first, the last entry being the current 7 days.
    pub clean_per_week: [u32; WEEKS],
    /// Plain-words reading of the evidence (copy rules in the skills design).
    pub diagnosis: String,
}

impl Skill {
    pub fn level(&self) -> Level {
        Level::of(self.mastery, self.evidence.attempts)
    }

    pub fn sureness(&self) -> Sureness {
        Sureness::of(self.recent)
    }

    /// A weak spot the UI may name: weak on enough recent attempts to say so.
    pub fn flagged(&self) -> bool {
        self.weak() && self.recent >= SURE_ATTEMPTS
    }

    /// A first read (1-3 recent attempts) with a cause: shown as "Watching", never weak.
    pub fn watch(&self) -> bool {
        self.cause.is_some() && (1..SURE_ATTEMPTS).contains(&self.recent)
    }

    /// "3 of 5 attempts not clean, 2 failed on edge cases" for reason lines.
    pub fn evidence_line(&self) -> String {
        let e = &self.evidence;
        let missed = e.attempts - e.clean;
        let base = format!("{missed} of {} attempts not clean", e.attempts);
        match self.cause {
            Some(c) => format!("{base}, {}", c.counted(self.cause_count(c))),
            None => base,
        }
    }

    pub fn cause_count(&self, c: Cause) -> u32 {
        let e = &self.evidence;
        match c {
            Cause::CantStart => e.cant_start,
            Cause::WrongApproach => e.wrong_approach,
            Cause::EdgeCases => e.edge_cases,
            Cause::TooSlow => e.too_slow,
            Cause::Forgetting => e.forgot,
        }
    }

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
    day: Date,
    age_days: f64,
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
                day,
                age_days,
                weight: 0.5f64.powf(age_days / HALF_LIFE_DAYS),
                score: score(a, t, r),
                label: classify(a, t, r),
                forgot,
                runs: r,
            });
    }

    let today = local_day(now, tz);
    let mut report = Report::default();
    for (mi, m) in c.modules.iter().enumerate().filter(|(_, m)| !m.bank) {
        let (mut w_sum, mut m_sum) = (0.0, 0.0);
        for (ti, t) in m.techniques.iter().enumerate() {
            let scored = by_tech.remove(&(mi, ti)).unwrap_or_default();
            let skill = build(
                c,
                (mi, ti),
                t.note.as_ref(),
                &t.problems,
                &scored,
                states,
                today,
            );
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

fn mark_of(s: &Scored) -> (Mark, String) {
    let a = s.a;
    let target = target_of(s.p);
    let tests = |r: Runs| format!("passed {} of {} tests", r.best_passed, r.best_total);
    match a.outcome {
        Outcome::Pass if a.hints > 0 || a.peeks > 0 => {
            let what = if a.peeks > 0 {
                "looked at the solution"
            } else {
                "used a hint"
            };
            (Mark::Hint, what.to_string())
        }
        Outcome::Pass if a.elapsed >= target => (
            Mark::Over,
            format!("{} min against {}", mins(a.elapsed), mins(target)),
        ),
        Outcome::Pass => (
            Mark::Clean,
            format!("clean in {} min", mins(a.elapsed).max(1)),
        ),
        _ if s.runs.best_total > 0 => (Mark::Missed, tests(s.runs)),
        _ => (Mark::Missed, "stopped before any test passed".to_string()),
    }
}

fn build(
    c: &Catalog,
    (module, technique): (usize, usize),
    note: Option<&std::path::PathBuf>,
    problems: &[usize],
    scored: &[Scored],
    states: &HashMap<String, State>,
    today: Date,
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

    let recent = scored
        .iter()
        .filter(|s| s.age_days <= RECENT_DAYS as f64)
        .count() as u32;
    let history = scored[scored.len().saturating_sub(HISTORY)..]
        .iter()
        .map(|s| {
            let (mark, detail) = mark_of(s);
            AttemptMark {
                problem: s.p.order,
                day: s.day,
                mark,
                cause: if s.forgot {
                    Some(Cause::Forgetting)
                } else {
                    s.label
                },
                detail,
            }
        })
        .collect();
    let mut clean_per_week = [0u32; WEEKS];
    for s in scored.iter().filter(|s| s.a.clean) {
        let back = i64::from((today - s.day).get_days()).max(0) / 7;
        if let Some(slot) = (WEEKS - 1).checked_sub(back as usize) {
            clean_per_week[slot] += 1;
        }
    }
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
        recent,
        history,
        clean_per_week,
        diagnosis: String::new(),
    };
    skill.diagnosis = diagnosis(c, &skill);
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

/// "Grid DFS" reads as "grid DFS" mid-sentence; "1D DP" stays as it is.
pub fn mid_sentence(title: &str) -> String {
    let first = title.split_whitespace().next().unwrap_or("");
    let shouty = first
        .chars()
        .filter(|c| c.is_alphabetic())
        .all(|c| c.is_uppercase());
    if shouty {
        return title.to_string();
    }
    let mut cs = title.chars();
    cs.next().map_or(String::new(), |f| {
        f.to_lowercase().collect::<String>() + cs.as_str()
    })
}

/// The plain-words reading of a technique: counts first, then the cause, then what was right.
pub fn diagnosis(c: &Catalog, s: &Skill) -> String {
    let e = &s.evidence;
    if e.attempts == 0 {
        return String::new();
    }
    let tech = mid_sentence(&c.modules[s.module].techniques[s.technique].title);
    let n = e.attempts;
    let mut out = match e.clean {
        0 => format!("None of your {n} {tech} attempts was a clean pass yet."),
        k if k == n => format!("All {n} of your {tech} attempts were clean passes."),
        k => format!("You passed {k} of {n} {tech} attempts cleanly."),
    };
    let missed = n - e.clean;
    if let Some(cause) = s.cause.filter(|_| missed > 0) {
        let k = s.cause_count(cause).min(missed);
        out += &format!(" Of the {missed} that weren't clean, {}.", cause.counted(k));
        if let Some(h) = s.history.iter().rev().find(|h| h.cause == Some(cause)) {
            out += &format!(
                " Most recent: {}, {}.",
                c.problems()[h.problem].title,
                h.detail
            );
        }
        out += match cause {
            Cause::EdgeCases => " Most tests passed each time, so the approach held.",
            Cause::TooSlow => " Each one passed, so the idea has landed; speed is what is left.",
            Cause::Forgetting => " The idea landed once and faded, rather than never landing.",
            Cause::CantStart | Cause::WrongApproach => "",
        };
    } else {
        out += match s.trend {
            Some(Trend::Improving) => " Your recent attempts are cleaner than the earlier ones.",
            Some(Trend::Slipping) => " Your recent attempts are less clean than the earlier ones.",
            _ => "",
        };
    }
    if s.recent > 0 && s.recent < SURE_ATTEMPTS {
        let a = if s.recent == 1 { "attempt" } else { "attempts" };
        out += &format!(
            " With {} {a} this is a first read, not a verdict.",
            s.recent
        );
    }
    out
}

const NOTE_MINUTES: u32 = 10;

fn actions(
    c: &Catalog,
    s: &Skill,
    note: Option<&std::path::PathBuf>,
    scored: &[Scored],
) -> Vec<Action> {
    let tech = &c.modules[s.module].techniques[s.technique].title;
    let e = &s.evidence;
    let act = |kind, p: &Problem, title: String, reason: String| Action {
        kind,
        problem: Some(p.order),
        note: None,
        reason,
        title,
        minutes: mins(target_of(p)).max(5) as u32,
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
                        "{} of {} attempts needed a hint or a restart",
                        e.wrong_approach, e.attempts
                    )
                };
                out.push(Action {
                    kind: ActionKind::ReadNote,
                    problem: None,
                    note: Some(path.to_string_lossy().replace('\\', "/")),
                    reason: why,
                    title: format!("Re-read the {tech} note"),
                    minutes: NOTE_MINUTES,
                });
            }
        }
        Some(Cause::EdgeCases) => {
            if let Some(x) = latest(scored, |x| x.label == Some(Cause::EdgeCases)) {
                out.push(act(
                    ActionKind::EdgeCaseRedo,
                    x.p,
                    format!("Edge-case drill: {}", x.p.title),
                    format!(
                        "{} passed {} of {} tests; list the edge cases first",
                        x.p.title, x.runs.best_passed, x.runs.best_total
                    ),
                ));
            }
        }
        Some(Cause::TooSlow) => {
            if let Some(x) = latest(scored, |x| x.label == Some(Cause::TooSlow)) {
                out.push(act(
                    ActionKind::TimedRep,
                    x.p,
                    format!("Timed rep: {}", x.p.title),
                    format!(
                        "{} took {} min against a {} min target",
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
                    x.p,
                    format!("Spaced redo: {}", x.p.title),
                    format!("{} slipped after an earlier clean pass", x.p.title),
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
                p,
                format!("Warm-up: {}", p.title),
                format!("The easiest unseen {} problem first", mid_sentence(tech)),
            ));
        } else if s.cause.is_none() {
            out.push(act(
                ActionKind::Next,
                p,
                format!("Next: {}", p.title),
                format!("Next in {}", mid_sentence(tech)),
            ));
        }
    }
    out
}

/// What one attempt changed for its technique, for the result sheet.
#[derive(Debug, Clone, PartialEq)]
pub struct Feedback {
    pub module: usize,
    pub technique: usize,
    pub before: Level,
    pub after: Level,
    pub trend: Option<Trend>,
    /// One or two sentences: the fact, then what it means or what comes next.
    pub text: String,
    /// It was a weak spot before this attempt and isn't now.
    pub cleared: bool,
    /// Still a weak spot after it.
    pub weak: bool,
}

/// Compares the skill model without and with attempt `id`.
pub fn feedback(
    c: &Catalog,
    events: &[Event],
    id: &str,
    now: Timestamp,
    tz: &TimeZone,
) -> Option<Feedback> {
    let target = |pid: &str| c.problem(pid).map_or(SignedDuration::ZERO, target_of);
    let p = c.problem(&events.iter().find(|e| e.attempt == id)?.problem)?;
    let attempts = schedule::attempts(events, target);
    let a = attempts
        .iter()
        .find(|a| a.id == id && a.outcome != Outcome::None)?;
    let before_ev: Vec<Event> = events.iter().filter(|e| e.attempt != id).cloned().collect();
    let model = |ev: &[Event]| assess(c, ev, &schedule::compute(ev, target, tz), now, tz);
    let (r0, r1) = (model(&before_ev), model(events));
    let (s0, s1) = (r0.of(p)?, r1.of(p)?);
    let tech = mid_sentence(&c.technique_of(p).title);
    let runs = runs_by_attempt(events).get(id).copied().unwrap_or_default();
    let (before, after) = (s0.level(), s1.level());
    let cleared = s0.flagged() && !s1.flagged();
    let e = &s1.evidence;
    let mut text = if a.clean {
        if cleared {
            format!(
                "{} is no longer a weak spot: {} of your {} attempts are clean passes now.",
                c.technique_of(p).title,
                e.clean,
                e.attempts
            )
        } else if after > before {
            format!(
                "{} moved up to {}: {} of your {} attempts are clean passes.",
                c.technique_of(p).title,
                after.word().to_lowercase(),
                e.clean,
                e.attempts
            )
        } else if s1.flagged() {
            format!(
                "A clean pass on a weak spot: {} of your {} {tech} attempts are clean now. It stays a weak spot until more of the recent ones are.",
                e.clean, e.attempts
            )
        } else {
            format!(
                "A clean pass. {} holds at {}.",
                c.technique_of(p).title,
                after.word().to_lowercase()
            )
        }
    } else if a.outcome == Outcome::Pass {
        let t = target_of(p);
        if a.hints > 0 || a.peeks > 0 {
            "It passed with help, so it counts toward the approach, not as a clean pass."
                .to_string()
        } else {
            format!(
                "It passed in {} min against a {} min target: right, but slow.",
                mins(a.elapsed),
                mins(t)
            )
        }
    } else if runs.best_total > 0 {
        format!("{} of {} tests passed.", runs.best_passed, runs.best_total)
    } else {
        "It stopped before any test passed.".to_string()
    };
    if !a.clean {
        if let (Some(c0), Some(c1)) = (s0.cause, s1.cause)
            && c0 == c1
        {
            text += &format!(" Same cause as before: {}.", c1.as_str());
        }
        if let Some(next) = s1.actions.iter().find(|x| x.kind != ActionKind::Next) {
            text += &format!(" Next for {tech}: {}.", next.title);
        }
    }
    Some(Feedback {
        module: p.module,
        technique: p.technique,
        before,
        after,
        trend: s1.trend,
        text,
        cleared,
        weak: s1.flagged(),
    })
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
        assert!(a.reason.contains("7 of 8 tests"), "{}", a.reason);
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
            a.reason.contains("took 40 min against a 20 min target"),
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
    fn levels_sureness_and_first_reads() {
        assert_eq!(Level::of(0.0, 0), Level::New);
        assert_eq!(Level::of(0.2, 3), Level::Shaky);
        assert_eq!(Level::of(0.5, 3), Level::Building);
        assert_eq!(Level::of(0.7, 3), Level::Solid);
        assert_eq!(Level::of(0.9, 3), Level::Strong);
        assert_eq!(
            [0, 1, 3, 4, 5, 6].map(Sureness::of),
            [
                Sureness::None,
                Sureness::FirstRead,
                Sureness::FirstRead,
                Sureness::FairlySure,
                Sureness::FairlySure,
                Sureness::Sure
            ]
        );
        // Two near misses: weak, with a cause, but only a first read.
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
        let (_, r) = report(&events, at(3, 12));
        let s = one(&r);
        assert!(s.weak() && !s.flagged() && s.watch());
        assert!(
            s.diagnosis
                .ends_with("With 2 attempts this is a first read, not a verdict."),
            "{}",
            s.diagnosis
        );
        assert!(s.diagnosis.starts_with("None of your 2 one attempts was a clean pass yet. Of the 2 that weren't clean, 2 failed on edge cases."), "{}", s.diagnosis);
        assert!(
            s.diagnosis
                .contains("Most recent: P Two, passed 7 of 8 tests."),
            "{}",
            s.diagnosis
        );
        for banned in [
            "struggle",
            "bad at",
            "weak at",
            "unfortunately",
            "only",
            "!",
        ] {
            assert!(
                !s.diagnosis.to_lowercase().contains(banned),
                "{banned}: {}",
                s.diagnosis
            );
        }
    }

    #[test]
    fn four_recent_misses_flag_a_weak_spot_with_history() {
        let events: Vec<Event> = (1..=4)
            .flat_map(|d| {
                att(
                    "p-two",
                    &format!("m{d}"),
                    at(d, 10),
                    &[(9, kind::TEST_RUN, RUN7), (10, kind::GAVE_UP, &[])],
                )
            })
            .chain(att("p-one", "c1", at(5, 10), &[(5, kind::PASSED, &[])]))
            .collect();
        let (c, r) = report(&events, at(6, 12));
        let s = one(&r);
        assert!(s.flagged() && !s.watch());
        assert_eq!((s.recent, s.sureness()), (5, Sureness::FairlySure));
        assert_eq!(s.history.len(), 5);
        assert_eq!(s.history[0].mark, Mark::Missed);
        assert_eq!(s.history[0].cause, Some(Cause::EdgeCases));
        assert_eq!(s.history[4].mark, Mark::Clean);
        assert_eq!(c.problems()[s.history[4].problem].id, "p-one");
        assert_eq!(s.clean_per_week.iter().sum::<u32>(), 1);
        assert_eq!(
            s.clean_per_week[WEEKS - 1],
            1,
            "this week's clean pass is last"
        );
        assert!(
            s.evidence_line()
                .starts_with("4 of 5 attempts not clean, 4 failed on edge cases"),
            "{}",
            s.evidence_line()
        );
        let a = &s.actions[0];
        assert_eq!(a.title, "Edge-case drill: P Two");
        assert!(a.minutes >= 5);
        // Old attempts drop out of the recent window.
        let (_, later) = report(&events, at(6, 12) + SignedDuration::from_hours(24 * 60));
        assert_eq!(one(&later).recent, 0);
    }

    #[test]
    fn feedback_compares_before_and_after_an_attempt() {
        let mut events: Vec<Event> = (1..=4)
            .flat_map(|d| {
                att(
                    "p-two",
                    &format!("m{d}"),
                    at(d, 10),
                    &[(9, kind::TEST_RUN, RUN7), (10, kind::GAVE_UP, &[])],
                )
            })
            .collect();
        events.extend(att(
            "p-two",
            "miss",
            at(5, 10),
            &[(9, kind::TEST_RUN, RUN7), (10, kind::GAVE_UP, &[])],
        ));
        let c = good_catalog();
        let f = feedback(&c, &events, "miss", at(6, 12), &chicago()).unwrap();
        assert!(
            f.text
                .starts_with("7 of 8 tests passed. Same cause as before: edge cases."),
            "{}",
            f.text
        );
        assert!(
            f.text.contains("Next for one: Edge-case drill: P Two."),
            "{}",
            f.text
        );
        assert!(f.weak && !f.cleared);
        events.extend(att("p-one", "win", at(6, 10), &[(5, kind::PASSED, &[])]));
        let f = feedback(&c, &events, "win", at(6, 12), &chicago()).unwrap();
        assert!(f.after >= f.before);
        assert!(!f.text.contains("Next for"), "{}", f.text);
        assert!(feedback(&c, &events, "nope", at(6, 12), &chicago()).is_none());
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
