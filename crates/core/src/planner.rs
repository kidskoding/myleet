//! The personalized planner: a day-by-day plan from today to the interview date (or
//! four weeks), built from the learner's history, skill model, availability windows,
//! daily budget, pace and target companies.
//!
//! It simulates the review ladder forward: every planned review is assumed to pass
//! cleanly and climbs a rung, every new problem lands on the 1-day rung. Each day
//! fills, in order: due reviews (most overdue first), a mock interview when one is
//! due, a check-in, new problems (techniques below their coverage goal first, ranked
//! by need, company relevance and reading order), one targeted drill from the skill
//! model, then keep-sharp drills on days with nothing new. Load never passes the
//! budget; whatever does not fit rolls to the next day. The plan is recomputed from
//! the real history every time, so a missed day simply moves its work forward.
//! Same inputs, same plan: no randomness and every sort has a total order.

use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};

use jiff::civil::{Date, Weekday};
use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp, ToSpan};
use serde::{Deserialize, Serialize};

use crate::catalog::{Catalog, Difficulty, Problem};
use crate::progress::{Event, kind, mode};
use crate::schedule::{self, Attempt, Outcome, RUNGS, State, Status, local_day};
use crate::skills::{self, ActionKind, Cause, Report, Skill};
use crate::{checkpoint, interview, placement};

/// Plan length when there is no interview date.
pub const DEFAULT_DAYS: i64 = 28;
/// Plans stop here however far away the interview is; the plan is rebuilt daily anyway.
pub const MAX_DAYS: i64 = 182;
/// Problems to have started per target technique by the interview: the target
/// companies' tracked problems in it, kept between these bounds (and the technique size).
const MIN_GOAL: usize = 2;
const MAX_GOAL: usize = 5;
/// Goal per technique when no company is selected.
const DEFAULT_GOAL: usize = 3;
/// Added to a measured weak spot's priority so weaknesses lead new work.
const WEAK_BONUS: f64 = 0.5;
/// The last days before the interview introduce nothing new.
const REVIEW_ONLY_DAYS: i64 = 2;
const REVIEW_SHARE: f64 = 0.6;
const MIN_ITEM_MINUTES: u32 = 5;
const NOTE_MINUTES: u32 = 10;
const CHECKPOINT_MINUTES: u32 = 30;
const CHECKPOINT_GAP_DAYS: i64 = 7;
const BREAK_MINUTES: u32 = 10;
/// Problems started before mock interviews are worth it.
const MOCK_MIN_SEEN: usize = 8;
const MOCK_EVERY_DAYS: i64 = 7;
const MOCK_EVERY_DAYS_NEAR: i64 = 3;
const NEAR_DAYS: i64 = 14;
/// Days ahead at which the interview starts weighting company relevance up.
const PROXIMITY_DAYS: f64 = 60.0;
const KEEP_SHARP_PER_DAY: usize = 2;
const KEEP_SHARP_REST_DAYS: i64 = 3;
const ORDER_WEIGHT: f64 = 0.3;
const MIN_PACE_SAMPLES: usize = 2;
const MIN_HOUR_SAMPLES: usize = 3;
const DEFAULT_HOUR: u32 = 19;
const SLACK_MINUTES: u32 = 30;
const DAY_MINUTES: u32 = 24 * 60;

/// Settings the planner reads. Field names match the Worker's `/api/me` settings, so
/// the client can pass those through unchanged; unknown fields are ignored.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// YYYY-MM-DD.
    pub interview_date: Option<String>,
    /// Company slugs: a playlist id without its `NNN_` prefix, e.g. `google`.
    pub target_companies: Vec<String>,
    pub new_per_day: u32,
    pub daily_minutes: u32,
    pub session_minutes: u32,
    pub availability: Vec<Window>,
    /// YYYY-MM-DD dates with no practice.
    pub days_off: Vec<String>,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings {
            interview_date: None,
            target_companies: Vec::new(),
            new_per_day: 3,
            daily_minutes: 60,
            session_minutes: 45,
            availability: Vec::new(),
            days_off: Vec::new(),
        }
    }
}

/// A weekly practice window, e.g. `{"days": ["mon","tue"], "start": "19:00", "end": "20:30"}`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Window {
    pub days: Vec<String>,
    pub start: String,
    /// `24:00` is allowed; windows never cross midnight.
    pub end: String,
}

pub const WEEKDAYS: [&str; 7] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/// Minutes after midnight of `HH:MM`; `24:00` only when `end`.
pub fn parse_hhmm(s: &str, end: bool) -> Option<u32> {
    let (h, m) = s.split_once(':')?;
    if h.len() != 2 || m.len() != 2 {
        return None;
    }
    let (h, m): (u32, u32) = (h.parse().ok()?, m.parse().ok()?);
    let v = h * 60 + m;
    (m < 60 && (h < 24 || (end && v == DAY_MINUTES))).then_some(v)
}

/// Checks windows the way the planner reads them; the Worker validates with this too.
pub fn validate_windows(ws: &[Window]) -> Result<(), String> {
    for w in ws {
        if w.days.is_empty() || !w.days.iter().all(|d| WEEKDAYS.contains(&d.as_str())) {
            return Err(format!("availability days must be some of {WEEKDAYS:?}"));
        }
        let (Some(s), Some(e)) = (parse_hhmm(&w.start, false), parse_hhmm(&w.end, true)) else {
            return Err("availability times must be HH:MM".to_string());
        };
        if s >= e {
            return Err("availability start must be before end".to_string());
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemKind {
    Review,
    New,
    Drill,
    Note,
    Mock,
    Checkpoint,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlanItem {
    pub kind: ItemKind,
    /// Problem id for review, new and drill items.
    pub problem: Option<String>,
    pub title: String,
    pub technique: Option<String>,
    pub minutes: u32,
    /// One short sentence on why this item is here.
    pub reason: String,
    /// Note path (relative to the content root) for note items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Session {
    /// `YYYY-MM-DD-N`, stable for a given day and slot so calendar updates replace it.
    pub id: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub minutes: u32,
    pub title: String,
    pub items: Vec<PlanItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Day {
    pub date: String,
    pub weekday: String,
    /// No windows, a day off, or nothing left in today's windows.
    pub rest: bool,
    pub minutes: u32,
    pub sessions: Vec<Session>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Coverage {
    pub module: String,
    pub technique: String,
    pub title: String,
    pub module_title: String,
    /// Target companies whose playlists lean on this technique.
    pub companies: Vec<String>,
    pub goal: usize,
    pub started_now: usize,
    pub projected: usize,
    /// `on_track` or `behind`.
    pub status: String,
    pub behind_by: usize,
    pub mastery: f64,
    pub confidence: f64,
    pub cause: Option<Cause>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Pace {
    /// Median clean-or-not pass time per difficulty, seconds.
    pub median_secs: BTreeMap<String, i64>,
    /// Your time over the default target per difficulty; 1.0 without enough samples.
    pub speed: BTreeMap<String, f64>,
    /// Minutes the plan budgets for a new problem per difficulty.
    pub new_minutes: BTreeMap<String, u32>,
    /// Local hour you pass most problems in, with at least 3 passes.
    pub best_hour: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Summary {
    pub days_left: Option<i64>,
    pub sessions: usize,
    pub minutes: u32,
    pub reviews: usize,
    pub new: usize,
    pub drills: usize,
    pub mocks: usize,
    pub checkpoints: usize,
    pub on_track: bool,
    /// Technique titles projected short of their goal.
    pub behind: Vec<String>,
    pub headline: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Plan {
    pub version: u32,
    pub generated_ms: i64,
    pub tz: String,
    pub start: String,
    /// Last planned day, inclusive.
    pub end: String,
    pub interview_date: Option<String>,
    pub pace: Pace,
    pub days: Vec<Day>,
    pub forecast: Vec<Coverage>,
    pub summary: Summary,
}

fn add_days(d: Date, n: i64) -> Date {
    d.checked_add(n.days()).expect("plan dates in range")
}

fn days_between(from: Date, to: Date) -> i64 {
    i64::from((to - from).get_days())
}

fn weekday_name(w: Weekday) -> &'static str {
    WEEKDAYS[w.to_monday_zero_offset() as usize]
}

fn local_ts(day: Date, minutes: u32, tz: &TimeZone) -> Timestamp {
    add_days(day, i64::from(minutes / DAY_MINUTES))
        .at(
            (minutes % DAY_MINUTES / 60) as i8,
            (minutes % 60) as i8,
            0,
            0,
        )
        .to_zoned(tz.clone())
        .expect("local time in range")
        .timestamp()
}

fn ceil_minutes(d: SignedDuration) -> u32 {
    ((d.as_secs().max(0) + 59) / 60) as u32
}

fn target_of(p: &Problem) -> SignedDuration {
    SignedDuration::try_from(p.time_target).unwrap_or(SignedDuration::ZERO)
}

/// The slug a company is selected by: the playlist id without its order prefix.
pub fn company_slug(playlist_id: &str) -> &str {
    match playlist_id.split_once('_') {
        Some((n, rest)) if !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()) => rest,
        _ => playlist_id,
    }
}

/// Per technique: (company title, tracked playlist problems in it) for each target
/// company, most first.
pub fn relevance(
    c: &Catalog,
    companies: &[String],
) -> HashMap<(usize, usize), Vec<(String, usize)>> {
    let mut out: HashMap<(usize, usize), Vec<(String, usize)>> = HashMap::new();
    for pl in c.playlists.iter().filter(|pl| {
        companies
            .iter()
            .any(|s| s == company_slug(&pl.id) || *s == pl.id)
    }) {
        let mut counts: BTreeMap<(usize, usize), usize> = BTreeMap::new();
        for p in pl.entries.iter().filter_map(|e| e.problem) {
            let p = &c.problems()[p];
            *counts.entry((p.module, p.technique)).or_default() += 1;
        }
        for (k, n) in counts {
            out.entry(k).or_default().push((pl.title.clone(), n));
        }
    }
    for v in out.values_mut() {
        v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    }
    out
}

/// How close the interview is, 0 (far or none) to 1 (today).
pub fn proximity(today: Date, interview: Option<Date>) -> f64 {
    interview.map_or(0.0, |d| {
        1.0 - (days_between(today, d).max(0) as f64 / PROXIMITY_DAYS).min(1.0)
    })
}

/// Ranking for new work: need, boosted by company relevance (more so near the
/// interview), a bonus for measured weak spots, and a gentle pull toward reading order.
pub fn priority(skill: &Skill, relevance: f64, proximity: f64, order_rank: f64) -> f64 {
    let weak = if skill.weak() { WEAK_BONUS } else { 0.0 };
    skill.need() * (1.0 + relevance * (1.0 + proximity)) + weak - ORDER_WEIGHT * order_rank
}

fn pace_of(c: &Catalog, attempts: &[Attempt], tz: &TimeZone) -> Pace {
    let mut times: BTreeMap<&str, Vec<SignedDuration>> = BTreeMap::new();
    let mut hours = [0usize; 24];
    for a in attempts.iter().filter(|a| a.outcome == Outcome::Pass) {
        let Some(p) = c.problem(&a.problem) else {
            continue;
        };
        times
            .entry(p.difficulty.as_str())
            .or_default()
            .push(a.elapsed);
        if let Some(end) = a.end {
            hours[end.to_zoned(tz.clone()).hour() as usize] += 1;
        }
    }
    let mut pace = Pace {
        median_secs: BTreeMap::new(),
        speed: BTreeMap::new(),
        new_minutes: BTreeMap::new(),
        best_hour: None,
    };
    for d in [Difficulty::Easy, Difficulty::Medium, Difficulty::Hard] {
        let default = SignedDuration::try_from(d.default_time_target()).expect("small");
        let mut speed = 1.0;
        if let Some(ts) = times.get_mut(d.as_str()) {
            ts.sort();
            let median = ts[ts.len() / 2];
            pace.median_secs.insert(d.as_str().into(), median.as_secs());
            if ts.len() >= MIN_PACE_SAMPLES {
                speed = (median.as_secs_f64() / default.as_secs_f64()).clamp(0.5, 2.0);
            }
        }
        pace.speed.insert(d.as_str().into(), speed);
        pace.new_minutes
            .insert(d.as_str().into(), ceil_minutes(default.mul_f64(speed)));
    }
    let total: usize = hours.iter().sum();
    if total >= MIN_HOUR_SAMPLES {
        // max_by_key keeps the last maximum; reverse so ties go to the earliest hour.
        pace.best_hour = (0..24u32).rev().max_by_key(|&h| hours[h as usize]);
    }
    pace
}

#[derive(Debug, Clone, Copy)]
struct Sim {
    rung: i32,
    due: Date,
    last: Date,
}

struct TechQ {
    skill: usize,
    queue: VecDeque<usize>,
    goal: usize,
    started: usize,
    placed: usize,
    priority: f64,
    order: usize,
    note: Option<(String, String)>,
}

enum Effect {
    Review(usize),
    New(usize, usize),
    Drill(usize),
    Note(usize),
    Mock,
    Checkpoint,
    Action(usize),
}

struct Chosen {
    item: PlanItem,
    effect: Effect,
}

struct Ctx<'a> {
    c: &'a Catalog,
    report: &'a Report,
    pace: &'a Pace,
    rel: &'a HashMap<(usize, usize), Vec<(String, usize)>>,
}

impl Ctx<'_> {
    fn new_minutes(&self, p: &Problem) -> u32 {
        let speed = self
            .pace
            .speed
            .get(p.difficulty.as_str())
            .copied()
            .unwrap_or(1.0);
        ceil_minutes(target_of(p).mul_f64(speed)).max(MIN_ITEM_MINUTES)
    }

    fn review_minutes(&self, p: &Problem) -> u32 {
        ((f64::from(self.new_minutes(p)) * REVIEW_SHARE).ceil() as u32).max(MIN_ITEM_MINUTES)
    }

    fn item(&self, kind: ItemKind, p: &Problem, minutes: u32, reason: String) -> PlanItem {
        PlanItem {
            kind,
            problem: Some(p.id.clone()),
            title: p.title.clone(),
            technique: Some(self.c.technique_of(p).title.clone()),
            minutes,
            reason,
            note: None,
        }
    }

    fn company_line(&self, p: &Problem) -> Option<String> {
        let (company, n) = self.rel.get(&(p.module, p.technique))?.first()?;
        let tech = self.c.technique_of(p).title.to_lowercase();
        let s = if *n == 1 { "" } else { "s" };
        Some(format!("{company} leans on {tech} ({n} problem{s})"))
    }

    fn new_reason(&self, p: &Problem, weak_mods: &HashSet<String>) -> String {
        let tech = &self.c.technique_of(p).title;
        let company = self.company_line(p);
        let Some(s) = self.report.of(p) else {
            return company.unwrap_or_else(|| format!("next in the curriculum: {tech}"));
        };
        let base = if s.weak() {
            format!("weak spot: {tech}, {}", s.struggle_text())
        } else if s.warming_up() {
            format!("warm-up: the easiest unseen {tech} problem first")
        } else if s.evidence.attempts == 0 && weak_mods.contains(&self.c.module_of(p).id) {
            format!(
                "weak spot: your check-in flagged {}",
                self.c.module_of(p).title
            )
        } else if let Some(line) = company {
            return line;
        } else if s.seen > 0 {
            format!("in progress: {tech}, {}/{} started", s.seen, s.total)
        } else {
            format!("next in the curriculum: {tech}")
        };
        match (s.weak() || s.warming_up(), self.company_line(p)) {
            (true, Some(line)) => format!("{base}; {line}"),
            _ => base,
        }
    }
}

fn review_reason(rung: i32, overdue: i64) -> String {
    let gap = RUNGS[rung.clamp(0, RUNGS.len() as i32 - 1) as usize];
    if overdue > 0 {
        format!("overdue {overdue}d: {gap}-day review")
    } else {
        format!("due: {gap}-day review")
    }
}

/// Packs items, in order, into sessions inside the windows. Returns
/// (start minute, end minute, item indices) and how many items fit.
fn pack(
    windows: &[(u32, u32)],
    minutes: &[u32],
    session_len: u32,
) -> (Vec<(u32, u32, Vec<usize>)>, usize) {
    let mut out = Vec::new();
    let mut i = 0;
    for &(ws, we) in windows {
        let mut cur = ws;
        while i < minutes.len() {
            let (mut dur, mut idx) = (0, Vec::new());
            while i < minutes.len() {
                let m = minutes[i];
                // A session may stretch to hold one long item.
                if cur + dur + m <= we && (dur + m <= session_len || idx.is_empty()) {
                    idx.push(i);
                    dur += m;
                    i += 1;
                } else {
                    break;
                }
            }
            if idx.is_empty() {
                break;
            }
            out.push((cur, cur + dur, idx));
            cur += dur + BREAK_MINUTES;
        }
    }
    out.sort_by_key(|s| s.0);
    (out, i)
}

fn session_title(items: &[PlanItem]) -> String {
    let count = |k| items.iter().filter(|i| i.kind == k).count();
    let mut parts = Vec::new();
    let plural = |n: usize, one: &str, many: &str| {
        if n == 1 {
            format!("1 {one}")
        } else {
            format!("{n} {many}")
        }
    };
    for (k, one, many) in [
        (ItemKind::Review, "review", "reviews"),
        (ItemKind::New, "new", "new"),
        (ItemKind::Drill, "drill", "drills"),
    ] {
        let n = count(k);
        if n > 0 {
            parts.push(plural(n, one, many));
        }
    }
    if count(ItemKind::Mock) > 0 {
        parts.push("mock interview".into());
    }
    if count(ItemKind::Checkpoint) > 0 {
        parts.push("check-in".into());
    }
    if count(ItemKind::Note) > 0 {
        parts.push("note".into());
    }
    parts.join(" + ")
}

/// Builds the plan. `tz_name` is echoed into the plan for calendar export.
pub fn plan(
    c: &Catalog,
    events: &[Event],
    settings: &Settings,
    now: Timestamp,
    tz: &TimeZone,
    tz_name: &str,
) -> Result<Plan, String> {
    validate_windows(&settings.availability)?;
    let interview = match &settings.interview_date {
        Some(s) => Some(
            s.parse::<Date>()
                .map_err(|e| format!("interview_date {s:?}: {e}"))?,
        ),
        None => None,
    };
    let mut days_off = HashSet::new();
    for d in &settings.days_off {
        days_off.insert(
            d.parse::<Date>()
                .map_err(|e| format!("days_off {d:?}: {e}"))?,
        );
    }
    let daily_minutes = settings.daily_minutes.min(DAY_MINUTES);
    let session_minutes = settings.session_minutes.max(MIN_ITEM_MINUTES);

    let target = |id: &str| c.problem(id).map_or(SignedDuration::ZERO, target_of);
    let attempts = schedule::attempts(events, target);
    let states: HashMap<String, State> = schedule::compute(events, target, tz);
    let report = skills::assess(c, events, &states, now, tz);
    let pace = pace_of(c, &attempts, tz);
    let rel = relevance(c, &settings.target_companies);
    let ctx = Ctx {
        c,
        report: &report,
        pace: &pace,
        rel: &rel,
    };

    let today = local_day(now, tz);
    let interview = interview.filter(|d| *d > today);
    let end = interview
        .unwrap_or(add_days(today, DEFAULT_DAYS))
        .min(add_days(today, MAX_DAYS));
    let prox = proximity(today, interview);

    // Weekly windows (minutes after midnight), or one daily window at your best hour.
    let mut week: [Vec<(u32, u32)>; 7] = Default::default();
    if settings.availability.is_empty() {
        let start = pace.best_hour.unwrap_or(DEFAULT_HOUR) * 60;
        let w = (
            start,
            (start + daily_minutes + SLACK_MINUTES).min(DAY_MINUTES),
        );
        week = std::array::from_fn(|_| vec![w]);
    } else {
        for w in &settings.availability {
            let s = parse_hhmm(&w.start, false).expect("validated");
            let e = parse_hhmm(&w.end, true).expect("validated");
            for d in &w.days {
                let i = WEEKDAYS.iter().position(|x| x == d).expect("validated");
                week[i].push((s, e));
            }
        }
    }
    // The window holding your best hour fills first, then the rest by start time.
    let best = pace.best_hour.map(|h| h * 60);
    for ws in &mut week {
        ws.sort();
        ws.dedup();
        ws.sort_by_key(|&(s, e)| (!best.is_some_and(|b| s <= b && b < e), s));
    }

    let mut sim: HashMap<usize, Sim> = HashMap::new();
    for (id, st) in states.iter().filter(|(_, st)| st.status != Status::Unseen) {
        let Some(p) = c.problem(id) else { continue };
        let last = st.last_finished.map_or(today, |t| local_day(t, tz));
        let due = st.due.map_or(today, |t| local_day(t, tz));
        sim.insert(
            p.order,
            Sim {
                rung: st.rung.max(0),
                due,
                last,
            },
        );
    }

    let weak_mods = {
        let mut out = HashSet::new();
        if let Some(r) = placement::load(events).filter(|r| !r.skipped) {
            out.extend(placement::weak_modules(&r));
        }
        if let Some(r) = checkpoint::load(events) {
            out.extend(checkpoint::weak_modules(&r));
        }
        out
    };
    let targets_all = rel.is_empty();
    let n_tech = report.techniques.len().max(1) as f64;
    let max_rel = rel
        .values()
        .map(|v| v.iter().map(|x| x.1).sum::<usize>())
        .max()
        .unwrap_or(1)
        .max(1) as f64;
    let mut techs: Vec<TechQ> = Vec::new();
    for (i, s) in report.techniques.iter().enumerate() {
        let tracked = rel
            .get(&(s.module, s.technique))
            .map_or(0, |v| v.iter().map(|x| x.1).sum::<usize>());
        let r = tracked as f64 / max_rel;
        let mut skill_need = s.clone();
        if s.evidence.attempts == 0 && weak_mods.contains(&c.modules[s.module].id) {
            skill_need.mastery = 0.0;
            skill_need.confidence = 1.0;
        }
        let goal = if targets_all {
            DEFAULT_GOAL
        } else if tracked > 0 {
            tracked.clamp(MIN_GOAL, MAX_GOAL)
        } else {
            0
        }
        .min(s.total);
        let note = s
            .actions
            .iter()
            .find(|a| a.kind == ActionKind::ReadNote)
            .and_then(|a| a.note.clone().map(|n| (n, a.reason.clone())));
        techs.push(TechQ {
            skill: i,
            queue: s.unseen.iter().copied().collect(),
            goal,
            started: s.seen,
            placed: 0,
            priority: priority(&skill_need, r, prox, i as f64 / n_tech),
            order: i,
            note,
        });
    }
    // Targeted drills from the skill model, most needed technique first.
    let mut pending: Vec<(f64, usize, usize)> = Vec::new();
    for (ti, t) in techs.iter().enumerate() {
        for (ai, a) in report.techniques[t.skill].actions.iter().enumerate() {
            if matches!(
                a.kind,
                ActionKind::EdgeCaseRedo | ActionKind::TimedRep | ActionKind::SpacedRedo
            ) {
                pending.push((t.priority, ti, ai));
            }
        }
    }
    pending.sort_by(|a, b| b.0.total_cmp(&a.0).then(a.1.cmp(&b.1)));
    let mut pending: VecDeque<(usize, usize)> =
        pending.into_iter().map(|(_, t, a)| (t, a)).collect();

    let mut last_mock = attempts
        .iter()
        .filter(|a| a.mode == mode::INTERVIEW)
        .map(|a| a.end.unwrap_or(a.start))
        .max()
        .map(|t| local_day(t, tz));
    let last_ck_time = events
        .iter()
        .filter(|e| e.kind == kind::CHECKPOINT_DONE)
        .map(|e| e.time)
        .max();
    let mut last_ck = last_ck_time.map(|t| local_day(t, tz));
    let mut passes_since = attempts
        .iter()
        .filter(|a| a.outcome == Outcome::Pass && a.mode == mode::PRACTICE)
        .filter(|a| last_ck_time.is_none_or(|s| a.end.unwrap_or(a.start) > s))
        .count();
    let new_today = states
        .values()
        .filter(|st| st.first_finished.is_some_and(|f| local_day(f, tz) == today))
        .count() as u32;
    let used_today: u32 = attempts
        .iter()
        .filter(|a| a.end.is_some_and(|e| local_day(e, tz) == today))
        .filter_map(|a| a.end.map(|e| ceil_minutes(e.duration_since(a.start))))
        .sum();
    let now_minute = {
        let z = now.to_zoned(tz.clone());
        let m = z.hour() as u32 * 60 + z.minute() as u32;
        m.div_ceil(5) * 5
    };

    let mut days = Vec::new();
    let mut day = today;
    while day < end {
        let mut windows: Vec<(u32, u32)> = if days_off.contains(&day) {
            vec![]
        } else {
            week[day.weekday().to_monday_zero_offset() as usize].clone()
        };
        let mut cap = daily_minutes;
        if day == today {
            windows = windows
                .into_iter()
                .filter_map(|(s, e)| (s.max(now_minute) < e).then_some((s.max(now_minute), e)))
                .collect();
            cap = cap.saturating_sub(used_today);
        }
        cap = cap.min(windows.iter().map(|(s, e)| e - s).sum());
        let mut chosen: Vec<Chosen> = Vec::new();
        let mut used = 0;
        let room: u32 = windows.iter().map(|(s, e)| e - s).sum();
        // The first item of a day may run past the budget, or a long problem could
        // never be planned on a short budget.
        let fits = |used: u32, m: u32| used + m <= cap || (used == 0 && cap > 0 && m <= room);

        // 1. Due reviews, most overdue first; never dropped for new work.
        let mut due: Vec<(i64, usize, Sim)> = sim
            .iter()
            .filter(|(_, s)| s.due <= day)
            .map(|(&p, s)| (days_between(s.due, day), p, *s))
            .collect();
        due.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
        let mut today_problems: HashSet<usize> = HashSet::new();
        for (overdue, pi, s) in due {
            let p = &c.problems()[pi];
            let m = ctx.review_minutes(p);
            if fits(used, m) {
                used += m;
                today_problems.insert(pi);
                chosen.push(Chosen {
                    item: ctx.item(ItemKind::Review, p, m, review_reason(s.rung, overdue)),
                    effect: Effect::Review(pi),
                });
            }
        }

        // 2. Mock interviews: weekly, every few days near the date, and one the day before.
        let days_left = interview.map(|d| days_between(day, d));
        let near = days_left.is_some_and(|n| n <= NEAR_DAYS);
        let every = if near {
            MOCK_EVERY_DAYS_NEAR
        } else {
            MOCK_EVERY_DAYS
        };
        let since = last_mock.map(|l| days_between(l, day));
        let final_day = days_left == Some(1);
        let mock_minutes = ceil_minutes(interview::ROUND_LENGTH);
        if sim.len() >= MOCK_MIN_SEEN
            && (since.is_none_or(|s| s >= every) || (final_day && since != Some(0)))
            && fits(used, mock_minutes)
        {
            used += mock_minutes;
            let reason = match days_left {
                Some(1) => "final mock before your interview".to_string(),
                Some(n) if near => format!("interview in {n} days: a mock every {every} days"),
                _ => "weekly mock interview".to_string(),
            };
            chosen.push(Chosen {
                item: PlanItem {
                    kind: ItemKind::Mock,
                    problem: None,
                    title: "Mock interview".into(),
                    technique: None,
                    minutes: mock_minutes,
                    reason,
                    note: None,
                },
                effect: Effect::Mock,
            });
        }

        // 3. Check-ins after enough passes, at most weekly.
        if passes_since >= checkpoint::CHECK_IN_EVERY
            && last_ck.is_none_or(|l| days_between(l, day) >= CHECKPOINT_GAP_DAYS)
            && fits(used, CHECKPOINT_MINUTES)
        {
            used += CHECKPOINT_MINUTES;
            chosen.push(Chosen {
                item: PlanItem {
                    kind: ItemKind::Checkpoint,
                    problem: None,
                    title: "Check-in".into(),
                    technique: None,
                    minutes: CHECKPOINT_MINUTES,
                    reason: format!("check-in: {passes_since} passes since the last one"),
                    note: None,
                },
                effect: Effect::Checkpoint,
            });
        }

        // 4. New problems: techniques below their goal first, then by priority.
        let review_only = days_left.is_some_and(|n| n <= REVIEW_ONLY_DAYS);
        let mut placed_new = 0;
        if !review_only {
            let slots =
                settings
                    .new_per_day
                    .saturating_sub(if day == today { new_today } else { 0 })
                    as usize;
            let mut order: Vec<usize> = (0..techs.len())
                .filter(|&i| !techs[i].queue.is_empty())
                .collect();
            order.sort_by(|&a, &b| {
                let (x, y) = (&techs[a], &techs[b]);
                (y.started + y.placed < y.goal)
                    .cmp(&(x.started + x.placed < x.goal))
                    .then(y.priority.total_cmp(&x.priority))
                    .then(x.order.cmp(&y.order))
            });
            let below = |t: &TechQ| t.started + t.placed < t.goal;
            // While a goal is open, spare minutes go to drills, not past-goal techniques.
            let any_below = order.iter().any(|&i| below(&techs[i]));
            for ti in order {
                if placed_new >= slots || (any_below && !below(&techs[ti])) {
                    break;
                }
                let Some(&pi) = techs[ti].queue.front() else {
                    continue;
                };
                let p = &c.problems()[pi];
                let m = ctx.new_minutes(p);
                let note_m = if techs[ti].note.is_some() {
                    NOTE_MINUTES
                } else {
                    0
                };
                if !fits(used, m + note_m) {
                    continue;
                }
                if let Some((path, reason)) = &techs[ti].note {
                    chosen.push(Chosen {
                        item: PlanItem {
                            kind: ItemKind::Note,
                            problem: None,
                            title: format!("Re-read: {}", c.technique_of(p).title),
                            technique: Some(c.technique_of(p).title.clone()),
                            minutes: NOTE_MINUTES,
                            reason: reason.clone(),
                            note: Some(path.clone()),
                        },
                        effect: Effect::Note(ti),
                    });
                }
                used += m + note_m;
                techs[ti].queue.pop_front();
                placed_new += 1;
                today_problems.insert(pi);
                chosen.push(Chosen {
                    item: ctx.item(ItemKind::New, p, m, ctx.new_reason(p, &weak_mods)),
                    effect: Effect::New(ti, pi),
                });
            }
        }

        // 5. One targeted drill (timed rep, edge-case redo, spaced redo) per day.
        if let Some(pos) = pending.iter().position(|&(t, a)| {
            let pi = report.techniques[techs[t].skill].actions[a]
                .problem
                .expect("drills name a problem");
            !today_problems.contains(&pi) && sim.get(&pi).is_none_or(|s| s.due > day)
        }) {
            let (t, a) = pending[pos];
            let action = &report.techniques[techs[t].skill].actions[a];
            let pi = action.problem.expect("drills name a problem");
            let p = &c.problems()[pi];
            let m = ctx.review_minutes(p);
            if fits(used, m) {
                used += m;
                today_problems.insert(pi);
                chosen.push(Chosen {
                    item: ctx.item(ItemKind::Drill, p, m, action.reason.clone()),
                    effect: Effect::Action(pos),
                });
            }
        }

        // 6. Keep sharp on days with nothing new: weakest, coldest started problems.
        if placed_new == 0 {
            let mut cands: Vec<(f64, Date, usize)> = sim
                .iter()
                .filter(|(p, s)| {
                    s.due > day
                        && !today_problems.contains(p)
                        && days_between(s.last, day) >= KEEP_SHARP_REST_DAYS
                })
                .map(|(&pi, s)| {
                    let p = &c.problems()[pi];
                    let need = report.of(p).map_or(0.0, Skill::need);
                    let r = if rel.contains_key(&(p.module, p.technique)) {
                        1.0
                    } else {
                        0.0
                    };
                    (need + r, s.last, pi)
                })
                .collect();
            cands.sort_by(|a, b| b.0.total_cmp(&a.0).then(a.1.cmp(&b.1)).then(a.2.cmp(&b.2)));
            let mut techs_used = HashSet::new();
            let mut n = 0;
            for (_, last, pi) in cands {
                let p = &c.problems()[pi];
                let m = ctx.review_minutes(p);
                if n >= KEEP_SHARP_PER_DAY || !fits(used, m) {
                    continue;
                }
                if !techs_used.insert((p.module, p.technique)) {
                    continue;
                }
                used += m;
                n += 1;
                let tech = &c.technique_of(p).title;
                let reason = match ctx.company_line(p) {
                    Some(line) => format!("keep sharp: {line}"),
                    None => format!(
                        "keep sharp: {tech}, last done {} days ago",
                        days_between(last, day)
                    ),
                };
                chosen.push(Chosen {
                    item: ctx.item(ItemKind::Drill, p, m, reason),
                    effect: Effect::Drill(pi),
                });
            }
        }

        // Pack into sessions; only what fits takes effect, the rest rolls forward.
        let minutes: Vec<u32> = chosen.iter().map(|ch| ch.item.minutes).collect();
        let (slots, fitted) = pack(&windows, &minutes, session_minutes);
        let mut chosen: Vec<Option<Chosen>> = chosen.into_iter().map(Some).collect();
        for ch in chosen.iter_mut().skip(fitted).rev() {
            if let Some(Chosen {
                effect: Effect::New(ti, pi),
                ..
            }) = ch.take()
            {
                techs[ti].queue.push_front(pi);
            }
        }
        let mut done_actions = Vec::new();
        let mut sessions = Vec::new();
        for (n, (s, e, idx)) in slots.into_iter().enumerate() {
            let mut items = Vec::new();
            for i in idx {
                let ch = chosen[i].take().expect("each item packs once");
                match ch.effect {
                    Effect::Review(pi) => {
                        let st = sim.get_mut(&pi).expect("reviews come from sim");
                        if day > st.last {
                            st.rung = (st.rung + 1).min(RUNGS.len() as i32 - 1);
                        }
                        st.due = add_days(day, RUNGS[st.rung as usize]);
                        st.last = day;
                        passes_since += 1;
                    }
                    Effect::New(ti, pi) => {
                        sim.insert(
                            pi,
                            Sim {
                                rung: 0,
                                due: add_days(day, RUNGS[0]),
                                last: day,
                            },
                        );
                        techs[ti].placed += 1;
                        passes_since += 1;
                    }
                    Effect::Note(ti) => techs[ti].note = None,
                    Effect::Drill(pi) => {
                        if let Some(st) = sim.get_mut(&pi) {
                            st.last = day;
                        }
                    }
                    Effect::Action(pos) => done_actions.push(pos),
                    Effect::Mock => last_mock = Some(day),
                    Effect::Checkpoint => {
                        last_ck = Some(day);
                        passes_since = 0;
                    }
                }
                items.push(ch.item);
            }
            let minutes = items.iter().map(|i| i.minutes).sum();
            sessions.push(Session {
                id: format!("{day}-{}", n + 1),
                start_ms: local_ts(day, s, tz).as_millisecond(),
                end_ms: local_ts(day, e, tz).as_millisecond(),
                minutes,
                title: session_title(&items),
                items,
            });
        }
        done_actions.sort_unstable();
        for pos in done_actions.into_iter().rev() {
            pending.remove(pos);
        }
        days.push(Day {
            date: day.to_string(),
            weekday: weekday_name(day.weekday()).into(),
            rest: sessions.is_empty(),
            minutes: sessions.iter().map(|s| s.minutes).sum(),
            sessions,
        });
        day = add_days(day, 1);
    }

    let mut forecast = Vec::new();
    for t in techs.iter().filter(|t| t.goal > 0) {
        let s = &report.techniques[t.skill];
        let (m, tech) = (
            &c.modules[s.module],
            &c.modules[s.module].techniques[s.technique],
        );
        let projected = s.seen + t.placed;
        let behind_by = t.goal.saturating_sub(projected);
        forecast.push(Coverage {
            module: m.id.clone(),
            technique: tech.id.clone(),
            title: tech.title.clone(),
            module_title: m.title.clone(),
            companies: rel
                .get(&(s.module, s.technique))
                .map_or(vec![], |v| v.iter().map(|x| x.0.clone()).collect()),
            goal: t.goal,
            started_now: s.seen,
            projected,
            status: if behind_by == 0 { "on_track" } else { "behind" }.into(),
            behind_by,
            mastery: s.mastery,
            confidence: s.confidence,
            cause: s.cause,
        });
    }
    let summary = summarize(&days, &forecast, today, interview);
    Ok(Plan {
        version: 1,
        generated_ms: now.as_millisecond(),
        tz: tz_name.to_string(),
        start: today.to_string(),
        end: days.last().map_or(today.to_string(), |d| d.date.clone()),
        interview_date: interview.map(|d| d.to_string()),
        pace,
        days,
        forecast,
        summary,
    })
}

fn summarize(days: &[Day], forecast: &[Coverage], today: Date, interview: Option<Date>) -> Summary {
    let items = || days.iter().flat_map(|d| &d.sessions).flat_map(|s| &s.items);
    let count = |k: ItemKind| items().filter(|i| i.kind == k).count();
    let behind: Vec<&Coverage> = forecast.iter().filter(|f| f.behind_by > 0).collect();
    let (reviews, new, mocks) = (
        count(ItemKind::Review),
        count(ItemKind::New),
        count(ItemKind::Mock),
    );
    let days_left = interview.map(|d| days_between(today, d));
    let lead = match (days_left, interview) {
        (Some(n), Some(d)) => format!("{n} days to {}", d.strftime("%b %-d")),
        _ => format!("Next {} days", days.len()),
    };
    let tail = if forecast.is_empty() {
        String::new()
    } else if behind.is_empty() {
        format!(" On track for all {} target techniques.", forecast.len())
    } else {
        let names: Vec<String> = behind
            .iter()
            .take(3)
            .map(|f| format!("{} (by {})", f.title, f.behind_by))
            .collect();
        format!(" Behind on {}.", names.join(", "))
    };
    Summary {
        days_left,
        sessions: days.iter().map(|d| d.sessions.len()).sum(),
        minutes: days.iter().map(|d| d.minutes).sum(),
        reviews,
        new,
        drills: count(ItemKind::Drill),
        mocks,
        checkpoints: count(ItemKind::Checkpoint),
        on_track: behind.is_empty(),
        behind: behind.iter().map(|f| f.title.clone()).collect(),
        headline: format!("{lead}: {new} new problems, {reviews} reviews, {mocks} mocks.{tail}"),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::testutil::{chicago, good_catalog};

    fn at(m: i8, d: i8, h: i8) -> Timestamp {
        jiff::civil::date(2026, m, d)
            .at(h, 0, 0, 0)
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

    fn pass(p: &str, id: &str, t: Timestamp, mins: i64) -> Vec<Event> {
        let ms = (mins * 60_000).to_string();
        vec![
            ev(t, kind::OPENED, p, id, &[]),
            ev(
                t + SignedDuration::from_mins(mins),
                kind::PASSED,
                p,
                id,
                &[("elapsed_ms", &ms)],
            ),
        ]
    }

    fn gave_up(p: &str, id: &str, t: Timestamp) -> Vec<Event> {
        vec![
            ev(t, kind::OPENED, p, id, &[]),
            ev(t + SignedDuration::from_mins(5), kind::GAVE_UP, p, id, &[]),
        ]
    }

    fn settings(json: &str) -> Settings {
        serde_json::from_str(json).unwrap()
    }

    fn run(events: &[Event], s: &Settings, now: Timestamp) -> Plan {
        plan(
            &good_catalog(),
            events,
            s,
            now,
            &chicago(),
            "America/Chicago",
        )
        .unwrap()
    }

    fn all_items(p: &Plan) -> Vec<(&str, &PlanItem)> {
        p.days
            .iter()
            .flat_map(|d| {
                d.sessions
                    .iter()
                    .flat_map(move |s| s.items.iter().map(move |i| (d.date.as_str(), i)))
            })
            .collect()
    }

    #[test]
    fn hhmm_and_windows() {
        assert_eq!(parse_hhmm("19:30", false), Some(1170));
        assert_eq!(parse_hhmm("24:00", true), Some(1440));
        for bad in ["24:00", "7:00", "19:60", "ab:cd", "1900"] {
            assert_eq!(parse_hhmm(bad, false), None, "{bad}");
        }
        let w = |d: &[&str], s: &str, e: &str| Window {
            days: d.iter().map(|x| x.to_string()).collect(),
            start: s.into(),
            end: e.into(),
        };
        assert!(validate_windows(&[w(&["mon", "sat"], "10:00", "12:00")]).is_ok());
        assert!(validate_windows(&[w(&["monday"], "10:00", "12:00")]).is_err());
        assert!(validate_windows(&[w(&["mon"], "12:00", "10:00")]).is_err());
        assert!(validate_windows(&[w(&[], "10:00", "12:00")]).is_err());
    }

    #[test]
    fn fresh_plan_runs_to_the_interview_inside_windows() {
        let s = settings(
            r#"{"interview_date":"2026-11-21","new_per_day":2,"daily_minutes":60,"session_minutes":45,
                "availability":[{"days":["mon","tue","wed","thu","fri"],"start":"19:00","end":"20:30"},
                                {"days":["sat"],"start":"10:00","end":"12:00"}],
                "days_off":["2026-11-17"]}"#,
        );
        // Saturday 2026-11-14, 08:00: today's Saturday window is still ahead.
        let p = run(&[], &s, at(11, 14, 8));
        assert_eq!(
            (p.start.as_str(), p.end.as_str()),
            ("2026-11-14", "2026-11-20")
        );
        let by_date: HashMap<&str, &Day> = p.days.iter().map(|d| (d.date.as_str(), d)).collect();
        assert!(by_date["2026-11-15"].rest, "Sunday has no window");
        assert!(by_date["2026-11-17"].rest, "a day off");
        let sat = by_date["2026-11-14"];
        assert!(!sat.rest);
        let start = sat.sessions[0].start_ms;
        assert_eq!(
            start,
            at(11, 14, 10).as_millisecond(),
            "Saturday starts at 10:00"
        );
        for d in &p.days {
            assert!(d.minutes <= 60, "{} over budget: {}", d.date, d.minutes);
            for sess in &d.sessions {
                assert!(sess.end_ms > sess.start_ms);
                assert_eq!(
                    sess.minutes,
                    sess.items.iter().map(|i| i.minutes).sum::<u32>()
                );
                assert!(!sess.title.is_empty());
            }
        }
        // Saturday's first new problem is due Sunday, a rest day, so it is reviewed Monday.
        let items = all_items(&p);
        assert!(items.iter().all(|(_, i)| !i.reason.is_empty()));
        let first_new = items.iter().find(|(_, i)| i.kind == ItemKind::New).unwrap();
        assert_eq!(first_new.0, "2026-11-14");
        let review = items
            .iter()
            .find(|(_, i)| i.kind == ItemKind::Review && i.problem == first_new.1.problem)
            .expect("the first new problem is reviewed later");
        assert_eq!(review.0, "2026-11-16", "1-day review the next practice day");
        assert!(
            review.1.reason.contains("1-day review"),
            "{}",
            review.1.reason
        );
        // Nothing new in the last 2 days before the interview.
        assert!(
            items
                .iter()
                .all(|(d, i)| i.kind != ItemKind::New || *d < "2026-11-19"),
            "review-only tail"
        );
        assert_eq!(p.summary.days_left, Some(7));
        assert!(
            p.summary.headline.starts_with("7 days to Nov 21"),
            "{}",
            p.summary.headline
        );
    }

    #[test]
    fn deterministic() {
        let events = [
            pass("p-one", "a", at(11, 1, 19), 10),
            gave_up("p-two", "b", at(11, 2, 19)),
        ]
        .concat();
        let s = settings(r#"{"target_companies":["meta"]}"#);
        let a = serde_json::to_string(&run(&events, &s, at(11, 14, 8))).unwrap();
        let b = serde_json::to_string(&run(&events, &s, at(11, 14, 8))).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn no_date_is_four_weeks_at_your_best_hour() {
        // Three passes ending around 21:xx: the default window moves to 21:00.
        let events = [
            pass("p-one", "a", at(11, 1, 21), 10),
            pass("p-two", "b", at(11, 2, 21), 10),
            pass("two-sum", "c", at(11, 3, 21), 10),
        ]
        .concat();
        let p = run(&events, &Settings::default(), at(11, 14, 8));
        assert_eq!(p.days.len() as i64, DEFAULT_DAYS);
        assert_eq!(p.pace.best_hour, Some(21));
        let first = p.days.iter().flat_map(|d| &d.sessions).next().unwrap();
        assert_eq!(first.start_ms, at(11, 14, 21).as_millisecond());
        assert!(p.interview_date.is_none() && p.summary.days_left.is_none());
    }

    #[test]
    fn missed_days_roll_forward_capped_at_budget() {
        // Four problems all due long ago and a 15-minute budget: no day is overloaded.
        let events = [
            pass("p-one", "a", at(10, 1, 19), 5),
            pass("p-two", "b", at(10, 1, 19), 5),
            pass("p-three", "c", at(10, 1, 19), 5),
            pass("two-sum", "d", at(10, 1, 19), 5),
        ]
        .concat();
        let s = settings(r#"{"daily_minutes":15,"new_per_day":0}"#);
        let p = run(&events, &s, at(11, 14, 8));
        for d in &p.days {
            let n: usize = d.sessions.iter().map(|s| s.items.len()).sum();
            assert!(
                d.minutes <= 15 || n == 1,
                "{}: {} min in {n} items",
                d.date,
                d.minutes
            );
        }
        let first_day: Vec<&PlanItem> = p.days[0].sessions.iter().flat_map(|s| &s.items).collect();
        assert!(!first_day.is_empty() && first_day.iter().all(|i| i.kind == ItemKind::Review));
        assert!(
            first_day[0].reason.starts_with("overdue"),
            "{}",
            first_day[0].reason
        );
        let reviewed: HashSet<&str> = all_items(&p)
            .iter()
            .filter(|(_, i)| i.kind == ItemKind::Review)
            .filter_map(|(_, i)| i.problem.as_deref())
            .collect();
        assert_eq!(reviewed.len(), 4, "every overdue review eventually lands");
    }

    #[test]
    fn weak_technique_gets_note_warmup_and_reason() {
        // Gave up twice on technique "one" with no test runs: can't start.
        let events = [
            gave_up("p-two", "a", at(11, 10, 19)),
            gave_up("p-two", "b", at(11, 11, 19)),
        ]
        .concat();
        let p = run(&events, &settings(r#"{"daily_minutes":90}"#), at(11, 14, 8));
        let items = all_items(&p);
        let note = items.iter().find(|(_, i)| i.kind == ItemKind::Note);
        let first_new = items.iter().find(|(_, i)| i.kind == ItemKind::New).unwrap();
        assert_eq!(
            first_new.1.problem.as_deref(),
            Some("p-one"),
            "easier warm-up first"
        );
        assert!(
            first_new.1.reason.starts_with("weak spot: One"),
            "{}",
            first_new.1.reason
        );
        if let Some((_, n)) = note {
            assert!(n.reason.contains("stalled"), "{}", n.reason);
        }
        let cov = p.forecast.iter().find(|f| f.technique == "one").unwrap();
        assert_eq!(cov.cause, Some(Cause::CantStart));
    }

    #[test]
    fn company_relevance_orders_new_work_and_forecast() {
        // Meta's playlist tracks two-sum (beta/three) and a bank problem.
        let s = settings(r#"{"target_companies":["meta"],"new_per_day":1}"#);
        let p = run(&[], &s, at(11, 14, 8));
        let first_new = all_items(&p)
            .into_iter()
            .find(|(_, i)| i.kind == ItemKind::New)
            .unwrap();
        assert_eq!(first_new.1.problem.as_deref(), Some("two-sum"));
        assert!(
            first_new.1.reason.contains("Meta leans on three"),
            "{}",
            first_new.1.reason
        );
        assert_eq!(p.forecast.len(), 1, "only Meta's techniques have goals");
        assert_eq!(p.forecast[0].status, "on_track");
        assert_eq!(p.forecast[0].companies, vec!["Meta".to_string()]);
    }

    #[test]
    fn behind_when_budget_cannot_cover() {
        let s = settings(r#"{"interview_date":"2026-11-16","new_per_day":1,"daily_minutes":20}"#);
        let p = run(&[], &s, at(11, 14, 8));
        assert!(!p.summary.on_track);
        assert!(
            p.summary.headline.contains("Behind on"),
            "{}",
            p.summary.headline
        );
    }

    #[test]
    fn targeted_drills_follow_the_skill_model() {
        // p-one passed in 30 min (target 15) twice: too slow -> a timed rep.
        let events = [
            pass("p-one", "a", at(11, 1, 19), 30),
            pass("p-one", "b", at(11, 3, 19), 30),
        ]
        .concat();
        let p = run(
            &events,
            &settings(r#"{"daily_minutes":120}"#),
            at(11, 14, 8),
        );
        let drill = all_items(&p)
            .into_iter()
            .find(|(_, i)| i.kind == ItemKind::Drill && i.reason.starts_with("timed rep"))
            .expect("a timed rep is planned");
        assert_eq!(drill.1.problem.as_deref(), Some("p-one"));
    }

    #[test]
    fn mocks_need_history_and_come_weekly() {
        let c = good_catalog();
        let events: Vec<Event> = c
            .curriculum()
            .enumerate()
            .flat_map(|(i, p)| pass(&p.id, &format!("x{i}"), at(11, 1 + i as i8, 19), 5))
            .collect();
        // The test catalog has 4 curriculum problems: below MOCK_MIN_SEEN, so no mocks.
        let p = run(
            &events,
            &settings(r#"{"daily_minutes":120}"#),
            at(11, 14, 8),
        );
        assert_eq!(p.summary.mocks, 0);
        assert!(MOCK_MIN_SEEN > c.curriculum().count());
    }

    #[test]
    fn pack_respects_windows_and_session_length() {
        let (s, fitted) = pack(&[(600, 690), (1140, 1200)], &[20, 20, 20, 40, 30], 45);
        assert_eq!(fitted, 4);
        assert_eq!(s[0], (600, 640, vec![0, 1]));
        assert_eq!(s[1], (650, 670, vec![2]));
        assert_eq!(s[2], (1140, 1180, vec![3]));
        // One item longer than a session still gets its own session.
        let (s, fitted) = pack(&[(0, 120)], &[60], 45);
        assert_eq!((fitted, s[0].1), (1, 60));
    }

    #[test]
    fn plan_json_round_trips() {
        let p = run(&[], &Settings::default(), at(11, 14, 8));
        let back: Plan = serde_json::from_str(&serde_json::to_string(&p).unwrap()).unwrap();
        assert_eq!(back, p);
    }

    #[test]
    fn bad_settings_are_errors() {
        let c = good_catalog();
        let tz = chicago();
        let now = at(11, 14, 8);
        assert!(
            plan(
                &c,
                &[],
                &settings(r#"{"interview_date":"soon"}"#),
                now,
                &tz,
                ""
            )
            .is_err()
        );
        assert!(plan(&c, &[], &settings(r#"{"days_off":["x"]}"#), now, &tz, "").is_err());
        assert!(
            serde_json::from_str::<Settings>(r#"{"theme":"dark","new_per_day":2}"#).is_ok(),
            "unknown fields ignored"
        );
    }

    #[test]
    fn company_slugs() {
        assert_eq!(company_slug("001_google"), "google");
        assert_eq!(company_slug("009_salesforce_slack"), "salesforce_slack");
        assert_eq!(company_slug("google"), "google");
    }
}
