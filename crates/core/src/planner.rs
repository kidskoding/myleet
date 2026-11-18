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
use crate::reason::{self, Facts};
use crate::schedule::{self, Attempt, Outcome, RUNGS, State, Status, local_day};
use crate::skills::{self, ActionKind, Cause, Report, Skill};
use crate::{checkpoint, interview, session};

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
/// Kept free of reviews each day (outside the review-only days) so a new problem always
/// fits; a backlog then clears over a few more days instead of crowding out new work.
const NEW_RESERVE_MINUTES: u32 = 25;
/// Days shorter than this go to reviews alone, since one new problem would take most of it.
const NEW_RESERVE_MIN_CAP: u32 = 45;
/// On an interview day with a known time: at most this much review, ending this long before it.
const WARMUP_MINUTES: u32 = 20;
const WARMUP_GAP_MINUTES: u32 = 60;
const REVIEW_SHARE: f64 = 0.6;
const MIN_ITEM_MINUTES: u32 = 5;
const NOTE_MINUTES: u32 = 10;
const CHECKPOINT_MINUTES: u32 = 30;
const CHECKPOINT_GAP_DAYS: i64 = 7;
const BREAK_MINUTES: u32 = 10;
/// Problems started before mock interviews are worth it.
const MOCK_MIN_SEEN: usize = 8;
const MOCK_EVERY_DAYS: i64 = 7;
/// A mock for an interview with a named company lands this many days before it.
const COMPANY_MOCK_DAYS: i64 = 3;
/// Relevance of a focus topic's techniques: as much as the technique a target company leans on most.
const FOCUS_RELEVANCE: f64 = 1.0;
/// How much more the next interview's company set counts than other targets.
const NEXT_COMPANY_WEIGHT: usize = 2;
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

/// One interview: a date and, optionally, a company (a playlist slug).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Interview {
    /// YYYY-MM-DD.
    pub date: String,
    #[serde(default)]
    pub company: Option<String>,
    /// `HH:MM` local start, when known: the day then gets a short warm-up before it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    /// The company's display name; filled in on the plan, ignored in settings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Settings the planner reads. Field names match the Worker's `/api/me` settings, so
/// the client can pass those through unchanged; unknown fields are ignored.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// YYYY-MM-DD.
    pub interview_date: Option<String>,
    /// Every interview. When empty, `interview_date` stands in as one with no company.
    pub interviews: Vec<Interview>,
    /// Company slugs: a playlist id without its `NNN_` prefix, e.g. `google`.
    pub target_companies: Vec<String>,
    /// Module ids the learner asked to focus on, e.g. `graphs`.
    pub focus_topics: Vec<String>,
    pub new_per_day: u32,
    pub daily_minutes: u32,
    pub session_minutes: u32,
    pub availability: Vec<Window>,
    /// YYYY-MM-DD dates with no practice.
    pub days_off: Vec<String>,
    /// Budget on Saturdays and Sundays; `daily_minutes` when unset.
    pub weekend_minutes: Option<u32>,
    /// One-day budget overrides, `YYYY-MM-DD` to minutes ("Shorter day").
    pub day_minutes: BTreeMap<String, u32>,
    /// Sessions the learner dragged to another window or day.
    pub moves: Vec<Move>,
    /// Times the learner is busy in their own calendar; no session overlaps one.
    pub busy: Vec<Busy>,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings {
            interview_date: None,
            interviews: Vec::new(),
            target_companies: Vec::new(),
            focus_topics: Vec::new(),
            new_per_day: 3,
            daily_minutes: 60,
            session_minutes: 45,
            availability: Vec::new(),
            days_off: Vec::new(),
            weekend_minutes: None,
            day_minutes: BTreeMap::new(),
            moves: Vec::new(),
            busy: Vec::new(),
        }
    }
}

impl Settings {
    /// Folds `interview_date` into `interviews`, points `interview_date` at the nearest
    /// interview after today (else today's, else the latest once all have passed), and adds
    /// the company of each interview from today on to the targets. Safe to apply twice.
    pub fn resolved(&self, today: Date) -> Settings {
        let mut s = self.clone();
        if s.interviews.is_empty()
            && let Some(d) = &s.interview_date
        {
            s.interviews.push(Interview {
                date: d.clone(),
                company: None,
                time: None,
                name: None,
            });
        }
        s.interviews.sort_by(|a, b| a.date.cmp(&b.date));
        let today_s = today.to_string();
        // Today's interview is still a target, but the plan paces toward the next one.
        let next = s
            .interviews
            .iter()
            .find(|i| i.date > today_s)
            .or_else(|| s.interviews.iter().find(|i| i.date == today_s));
        if let Some(n) = next.or(s.interviews.last()) {
            s.interview_date = Some(n.date.clone());
        }
        let wanted: Vec<String> = s
            .interviews
            .iter()
            .filter(|i| i.date >= today_s)
            .filter_map(|i| i.company.clone())
            .collect();
        for c in wanted {
            if !s.target_companies.contains(&c) {
                s.target_companies.push(c);
            }
        }
        s
    }

    /// The budget for a date before one-day overrides.
    pub fn budget_on(&self, day: Date) -> u32 {
        let weekend = day.weekday().to_monday_zero_offset() >= 5;
        match (weekend, self.weekend_minutes) {
            (true, Some(m)) => m,
            _ => self.daily_minutes,
        }
    }
}

/// Practice time moved from one slot to another: `minutes` starting at `from_start` on
/// `from` now happen at `to_start` on `to`. The planner refills both days, so the moved
/// block holds whatever is due on its new day.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Move {
    pub from: String,
    pub from_start: String,
    pub to: String,
    pub to_start: String,
    pub minutes: u32,
}

/// A busy block from the learner's calendar, UTC milliseconds, `[start_ms, end_ms)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Busy {
    pub start_ms: i64,
    pub end_ms: i64,
}

/// The minutes of `day` (local) that `busy` covers. A block whose time can't be read
/// covers the whole day: unknown time is busy, never free.
fn busy_on(day: Date, busy: &[Busy], tz: &TimeZone) -> Vec<(u32, u32)> {
    let local = |ms: i64| {
        Timestamp::from_millisecond(ms)
            .ok()
            .map(|t| t.to_zoned(tz.clone()))
    };
    let minute = |z: &jiff::Zoned| z.hour() as u32 * 60 + z.minute() as u32;
    let mut out = Vec::new();
    for b in busy.iter().filter(|b| b.end_ms > b.start_ms) {
        let (Some(s), Some(e)) = (local(b.start_ms), local(b.end_ms)) else {
            return vec![(0, DAY_MINUTES)];
        };
        if s.date() > day || e.date() < day {
            continue;
        }
        let from = if s.date() < day { 0 } else { minute(&s) };
        let to = if e.date() > day {
            DAY_MINUTES
        } else {
            // A block ending at 10:00:30 still covers the 10:00 minute.
            minute(&e) + u32::from(e.second() > 0 || e.subsec_nanosecond() > 0)
        };
        if from < to {
            out.push((from, to));
        }
    }
    out
}

/// A window on one date, `HH:MM` to `HH:MM`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Span {
    pub start: String,
    pub end: String,
}

pub fn hhmm(m: u32) -> String {
    format!("{:02}:{:02}", m / 60, m % 60)
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

/// The reason tag an item wears: the same hold colours as Today's queue.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tag {
    #[default]
    Review,
    /// A weak spot measured on at least `skills::SURE_ATTEMPTS` recent attempts.
    Weak,
    New,
    Progress,
    Sharp,
    Mock,
    Check,
}

/// A short "why this one" phrase with a Lucide icon name, for Today's next-up.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Chip {
    pub icon: String,
    pub text: String,
}

fn chip(icon: &str, text: String) -> Chip {
    Chip {
        icon: icon.into(),
        text,
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlanItem {
    pub kind: ItemKind,
    #[serde(default)]
    pub tag: Tag,
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
    /// Up to three short reasons, most specific first.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub chips: Vec<Chip>,
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
    /// The date this block was dragged from.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub moved_from: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Day {
    pub date: String,
    pub weekday: String,
    /// No windows, a day off, or nothing left in today's windows.
    pub rest: bool,
    pub minutes: u32,
    pub sessions: Vec<Session>,
    /// The day's budget (0 on a day off).
    #[serde(default)]
    pub cap: u32,
    #[serde(default)]
    pub off: bool,
    /// The whole day's practice windows, moves applied (today's are not trimmed to now).
    #[serde(default)]
    pub windows: Vec<Span>,
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
    /// Started problems already on the mastered rung.
    #[serde(default)]
    pub mastered_now: usize,
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
    /// Median minutes for a review (a pass on a problem passed before).
    #[serde(default)]
    pub review_minutes: Option<u32>,
    /// Passes the medians come from.
    #[serde(default)]
    pub sample: usize,
    /// "You pass most problems between 9 and 10 pm."
    #[serde(default)]
    pub habit: Option<String>,
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
    /// Today's and later interviews, soonest first, for flags on the chart and calendar.
    #[serde(default)]
    pub interviews: Vec<Interview>,
    pub pace: Pace,
    pub days: Vec<Day>,
    pub forecast: Vec<Coverage>,
    pub summary: Summary,
    /// What changed since the last plan, newest first; the UI shows the first.
    #[serde(default)]
    pub notes: Vec<Note>,
}

/// A re-plan note: what changed, in counts, and what it means for the date.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Note {
    /// `missed`, `away`, `great_day`, `over_budget`, `cram`, `date_passed`, `backlog`.
    pub kind: String,
    /// The bold first sentence.
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub actions: Vec<NoteAction>,
}

/// `kind` is `weekday_minutes` (value = minutes), `availability`, `set_date`,
/// `clear_date` or `open_plan`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NoteAction {
    pub kind: String,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub value: Option<u32>,
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
        sample: attempts
            .iter()
            .filter(|a| a.outcome == Outcome::Pass)
            .count(),
        ..Pace::default()
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
    pace.habit = pace.best_hour.map(|h| {
        format!(
            "You pass most problems between {}.",
            crate::habits::range(h * 60, h * 60 + 60).replacen(" to ", " and ", 1)
        )
    });
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
    /// Modules the learner picked as focus topics.
    focus: &'a HashSet<usize>,
    states: &'a HashMap<String, State>,
    today: Date,
    interview: Option<Date>,
    /// Days since each LeetCode-imported problem was solved there.
    lc_days: &'a HashMap<String, i64>,
}

/// Up to three chips, no repeats.
fn push_chip(chips: &mut Vec<Chip>, c: Option<Chip>) {
    if let Some(c) = c
        && chips.len() < 3
        && !chips.iter().any(|x| x.text == c.text)
    {
        chips.push(c);
    }
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

    fn item(
        &self,
        kind: ItemKind,
        tag: Tag,
        p: &Problem,
        minutes: u32,
        reason: String,
    ) -> PlanItem {
        PlanItem {
            kind,
            tag,
            problem: Some(p.id.clone()),
            title: p.title.clone(),
            technique: Some(self.c.technique_of(p).title.clone()),
            minutes,
            reason,
            note: None,
            chips: Vec::new(),
        }
    }

    fn tech(&self, p: &Problem) -> String {
        skills::mid_sentence(&self.c.technique_of(p).title)
    }

    /// The weak tag needs enough recent attempts to say so; otherwise it is work in progress.
    fn weak_or(&self, p: &Problem, other: Tag) -> Tag {
        if self.report.of(p).is_some_and(Skill::flagged) {
            Tag::Weak
        } else {
            other
        }
    }

    fn company(&self, p: &Problem) -> Option<(&str, usize)> {
        self.rel
            .get(&(p.module, p.technique))?
            .first()
            .map(|(c, n)| (c.as_str(), *n))
    }

    fn company_chip(&self, p: &Problem) -> Option<Chip> {
        let (company, _) = self.company(p)?;
        Some(chip(
            "building-2",
            format!("{company} leans on {}", self.tech(p)),
        ))
    }

    fn review(&self, p: &Problem, s: &Sim) -> PlanItem {
        let stage = crate::schedule::mastery_stage(s.rung);
        // Worded from today, since the reason is read today even on a later day's item.
        let reason = match days_between(s.due, self.today) {
            n if n < 0 => format!("Due {} while it's {stage}", day_name(s.due, self.today)),
            0 => format!("Due today while it's {stage}"),
            1 => format!("Due yesterday while it's {stage}"),
            n => format!("Due {n} days ago while it's {stage}"),
        };
        let reason = match self.lc_days.get(&p.id) {
            Some(n) => format!("{reason}, {}", reason::leetcode_clause(*n)),
            None => reason,
        };
        // Like new work, a review says when its pattern matters for a target company.
        let reason = match self.company(p) {
            Some((co, n)) => format!(
                "{reason}. {} shows up in {} of {co}'s problems",
                reason::cap(&self.tech(p)),
                if n == 1 {
                    "one".to_string()
                } else {
                    n.to_string()
                }
            ),
            None => reason,
        };
        let mut it = self.item(
            ItemKind::Review,
            Tag::Review,
            p,
            self.review_minutes(p),
            reason,
        );
        let mut label = stage.to_string();
        label[..1].make_ascii_uppercase();
        it.chips.push(chip("repeat", label));
        it
    }

    /// What the learner's own data says about this problem, for the "Why this one" line.
    fn facts(&self, p: &Problem, warmup: bool) -> Facts {
        let skill = self.report.of(p);
        let st = self.states.get(&p.id);
        let last = skill.and_then(|s| {
            s.history
                .iter()
                .rev()
                .find(|m| self.c.problems()[m.problem].id == p.id)
                .map(|m| (m.mark, m.cause, days_between(m.day, self.today)))
        });
        let rung = st.map_or(-1, |s| s.rung);
        let weakest = skill.is_some_and(|s| {
            s.evidence.attempts > 0
                && self
                    .report
                    .techniques
                    .iter()
                    .filter(|t| t.evidence.attempts > 0)
                    .all(|t| t.need() <= s.need())
        });
        Facts {
            tech: self.tech(p),
            last,
            clean_days: RUNGS.get((rung + 1) as usize).copied(),
            on_ladder: rung >= 0,
            level: skill.map(Skill::level),
            weakest,
            warmup,
            first_in_tech: skill.is_none_or(|s| s.evidence.attempts == 0),
            company: self.company(p).map(|(c, n)| (c.to_string(), n)),
            sets: self
                .rel
                .get(&(p.module, p.technique))
                .map_or_else(Vec::new, |v| v.iter().map(|(c, _)| c.clone()).collect()),
            focus: self
                .focus
                .contains(&p.module)
                .then(|| skills::mid_sentence(&self.c.module_of(p).title)),
            days_left: self.interview.map(|d| days_between(self.today, d)),
            pace: self
                .pace
                .median_secs
                .get(p.difficulty.as_str())
                .map(|s| (p.difficulty.as_str().to_string(), (*s as u32).div_ceil(60))),
        }
    }

    fn new_item(&self, p: &Problem, weak_mods: &HashMap<String, &'static str>) -> PlanItem {
        let tech = self.tech(p);
        let skill = self.report.of(p);
        let started = self.states.get(&p.id).is_some_and(|st| st.attempts > 0);
        let flagged = skill.is_some_and(Skill::flagged);
        let mut chips = Vec::new();
        let tag = if flagged {
            push_chip(
                &mut chips,
                Some(chip("crosshair", format!("Weak spot: {tech}"))),
            );
            Tag::Weak
        } else if skill.is_some_and(Skill::warming_up) {
            push_chip(&mut chips, Some(chip("footprints", "Warm-up".into())));
            Tag::New
        } else if started {
            push_chip(
                &mut chips,
                Some(chip("history", "Started, not passed yet".into())),
            );
            Tag::Progress
        } else if let Some(by) = weak_mods
            .get(&self.c.module_of(p).id)
            .filter(|_| skill.is_none_or(|s| s.evidence.attempts == 0))
        {
            let m = &self.c.module_of(p).title;
            let by = match *by {
                "diagnostic" => "Diagnostic",
                "check-in" => "Check-in",
                other => other,
            };
            push_chip(
                &mut chips,
                Some(chip(
                    "list-checks",
                    format!("{by} flagged {}", skills::mid_sentence(m)),
                )),
            );
            Tag::New
        } else if self.company(p).is_some() || skill.is_some_and(|s| s.seen > 0) {
            Tag::New
        } else {
            push_chip(
                &mut chips,
                Some(chip("book-open", "Next in the curriculum".into())),
            );
            Tag::New
        };
        push_chip(&mut chips, self.company_chip(p));
        let reason = reason::build(&self.facts(p, skill.is_some_and(Skill::warming_up)));
        let mut it = self.item(ItemKind::New, tag, p, self.new_minutes(p), reason);
        it.chips = chips;
        it
    }
}

/// "30 min", "1 h", "1 h 30".
pub fn fmt_minutes(m: u32) -> String {
    match (m / 60, m % 60) {
        (0, r) => format!("{r} min"),
        (h, 0) => format!("{h} h"),
        (h, r) => format!("{h} h {r}"),
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
    let mut cs = parts.join(", ").chars().collect::<Vec<_>>();
    if let Some(c) = cs.first_mut() {
        *c = c.to_ascii_uppercase();
    }
    cs.into_iter().collect()
}

/// Builds the plan with its re-plan notes. `tz_name` is echoed into the plan for
/// calendar export.
pub fn plan(
    c: &Catalog,
    events: &[Event],
    settings: &Settings,
    now: Timestamp,
    tz: &TimeZone,
    tz_name: &str,
) -> Result<Plan, String> {
    let settings = &settings.resolved(local_day(now, tz));
    let mut p = build(c, events, settings, now, tz, tz_name)?;
    p.notes = notes(c, events, settings, now, tz, &p);
    Ok(p)
}

/// One-day changes parsed from settings: windows moved in, out, and budget overrides.
struct DayEdits {
    /// (date, start, end, moved from)
    added: Vec<(Date, u32, u32, Date)>,
    /// (date, start, end)
    removed: Vec<(Date, u32, u32)>,
    caps: HashMap<Date, u32>,
}

fn day_edits(settings: &Settings) -> Result<DayEdits, String> {
    let date = |s: &str, what: &str| s.parse::<Date>().map_err(|e| format!("{what} {s:?}: {e}"));
    let mut out = DayEdits {
        added: Vec::new(),
        removed: Vec::new(),
        caps: HashMap::new(),
    };
    for (d, m) in &settings.day_minutes {
        out.caps
            .insert(date(d, "day_minutes")?, (*m).min(DAY_MINUTES));
    }
    for mv in &settings.moves {
        let (from, to) = (date(&mv.from, "moves.from")?, date(&mv.to, "moves.to")?);
        let (Some(fs), Some(ts)) = (
            parse_hhmm(&mv.from_start, false),
            parse_hhmm(&mv.to_start, false),
        ) else {
            return Err("moves times must be HH:MM".to_string());
        };
        let m = mv.minutes.clamp(MIN_ITEM_MINUTES, DAY_MINUTES);
        if (from, fs) == (to, ts) {
            continue;
        }
        out.removed.push((from, fs, (fs + m).min(DAY_MINUTES)));
        out.added.push((to, ts, (ts + m).min(DAY_MINUTES), from));
    }
    Ok(out)
}

/// `ws` minus `[s, e)`.
fn subtract(ws: &[(u32, u32)], s: u32, e: u32) -> Vec<(u32, u32)> {
    let mut out = Vec::new();
    for &(a, b) in ws {
        if e <= a || b <= s {
            out.push((a, b));
            continue;
        }
        if a < s {
            out.push((a, s));
        }
        if e < b {
            out.push((e, b));
        }
    }
    out
}

/// Merges overlapping or touching windows, keeping the first one's position in the order.
fn merge(ws: Vec<(u32, u32)>) -> Vec<(u32, u32)> {
    let mut out: Vec<(u32, u32)> = Vec::new();
    for (s, e) in ws {
        if let Some(w) = out.iter_mut().find(|w| s <= w.1 && w.0 <= e) {
            *w = (w.0.min(s), w.1.max(e));
        } else {
            out.push((s, e));
        }
    }
    out
}

fn build(
    c: &Catalog,
    events: &[Event],
    settings: &Settings,
    now: Timestamp,
    tz: &TimeZone,
    tz_name: &str,
) -> Result<Plan, String> {
    validate_windows(&settings.availability)?;
    for i in &settings.interviews {
        i.date
            .parse::<Date>()
            .map_err(|e| format!("interviews {:?}: {e}", i.date))?;
    }
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
    let edits = day_edits(settings)?;
    let session_minutes = settings.session_minutes.max(MIN_ITEM_MINUTES);

    let target = |id: &str| c.problem(id).map_or(SignedDuration::ZERO, target_of);
    let attempts = schedule::attempts(events, target);
    let states: HashMap<String, State> = schedule::compute(events, target, tz);
    let report = skills::assess(c, events, &states, now, tz);
    let mut pace = pace_of(c, &attempts, tz);
    pace.review_minutes = crate::habits::review_minutes(c, events);
    let rel = relevance(c, &settings.target_companies);
    let focus_mods: HashSet<usize> = (0..c.modules.len())
        .filter(|&m| settings.focus_topics.contains(&c.modules[m].id))
        .collect();
    let today = local_day(now, tz);
    let interview = interview.filter(|d| *d > today);
    let lc_days = crate::leetcode::solved_days(events, &states, today, tz);
    let ctx = Ctx {
        lc_days: &lc_days,
        c,
        report: &report,
        pace: &pace,
        rel: &rel,
        focus: &focus_mods,
        states: &states,
        today,
        interview,
    };
    // The plan keeps going after an interview: at least four weeks, and past the date
    // when it's sooner, so practice carries on (toward the next interview, if any).
    let rolling = add_days(today, DEFAULT_DAYS);
    let end = interview
        .map_or(rolling, |d| d.max(rolling))
        .min(add_days(today, MAX_DAYS));
    // Every upcoming interview, so each day paces toward the next one on or after it.
    let mut upcoming: Vec<Date> = settings
        .interviews
        .iter()
        .filter_map(|i| i.date.parse::<Date>().ok())
        .chain(interview)
        .filter(|d| *d > today)
        .collect();
    upcoming.sort();
    upcoming.dedup();
    // Interview days from today on, with the earliest known start time; None when no time is set.
    let mut iv_days: HashMap<Date, Option<u32>> = HashMap::new();
    for i in &settings.interviews {
        let Ok(d) = i.date.parse::<Date>() else {
            continue;
        };
        if d < today {
            continue;
        }
        let t = i.time.as_deref().and_then(|t| parse_hhmm(t, false));
        let e = iv_days.entry(d).or_insert(t);
        *e = match (*e, t) {
            (Some(a), Some(b)) => Some(a.min(b)),
            (a, b) => a.or(b),
        };
    }
    let prox = proximity(today, interview);

    // Weekly windows (minutes after midnight), or one daily window at your best hour.
    let mut week: [Vec<(u32, u32)>; 7] = Default::default();
    if settings.availability.is_empty() {
        let start = pace.best_hour.unwrap_or(DEFAULT_HOUR) * 60;
        week = std::array::from_fn(|i| {
            let budget = match (i >= 5, settings.weekend_minutes) {
                (true, Some(m)) => m,
                _ => settings.daily_minutes,
            };
            vec![(
                start,
                (start + budget.min(DAY_MINUTES) + SLACK_MINUTES).min(DAY_MINUTES),
            )]
        });
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

    let weak_mods = session::weak_modules(events);
    let lc = crate::leetcode::load(events);
    let targets_all = rel.is_empty();
    let n_tech = report.techniques.len().max(1) as f64;
    let max_rel = rel
        .values()
        .map(|v| v.iter().map(|x| x.1).sum::<usize>())
        .max()
        .unwrap_or(1)
        .max(1) as f64;
    // The company you meet next counts double until that interview.
    let focus = next_company(settings).and_then(|slug| company_name(c, slug));
    let mut techs: Vec<TechQ> = Vec::new();
    for (i, s) in report.techniques.iter().enumerate() {
        let sets = rel.get(&(s.module, s.technique));
        let tracked = sets.map_or(0, |v| v.iter().map(|x| x.1).sum::<usize>());
        let weighted = sets.map_or(0, |v| {
            v.iter()
                .map(|(t, n)| {
                    if Some(t) == focus.as_ref() {
                        n * NEXT_COMPANY_WEIGHT
                    } else {
                        *n
                    }
                })
                .sum::<usize>()
        });
        let focused = focus_mods.contains(&s.module);
        let r = weighted as f64 / max_rel;
        let r = if focused { r.max(FOCUS_RELEVANCE) } else { r };
        let mut skill_need = s.clone();
        if s.evidence.attempts == 0 && weak_mods.contains_key(&c.modules[s.module].id) {
            skill_need.mastery = 0.0;
            skill_need.confidence = 1.0;
        } else if s.evidence.attempts == 0
            && lc
                .as_ref()
                .is_some_and(|i| i.strong(&c.modules[s.module].id))
        {
            // Plenty of LeetCode solves here: start from the middle, not from zero.
            skill_need.mastery = 0.5;
            skill_need.confidence = 0.5;
        }
        let goal = if targets_all {
            DEFAULT_GOAL
        } else if tracked > 0 {
            tracked.clamp(MIN_GOAL, MAX_GOAL)
        } else {
            0
        };
        // A focus topic is in the plan even when no target company leans on it.
        let goal = if focused {
            goal.max(DEFAULT_GOAL)
        } else {
            goal
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
        let off = days_off.contains(&day);
        let mut windows: Vec<(u32, u32)> = Vec::new();
        let mut moved_wins: Vec<(u32, u32)> = Vec::new();
        let mut moved_in: Vec<(u32, u32, Date)> = Vec::new();
        let mut cap = edits
            .caps
            .get(&day)
            .copied()
            .unwrap_or(settings.budget_on(day).min(DAY_MINUTES));
        let mut full_windows = Vec::new();
        if !off {
            let mut moved = Vec::new();
            for &(_, s, e, from) in edits.added.iter().filter(|a| a.0 == day) {
                moved_in.push((s, e, from));
                moved.push((s, e));
                cap += e - s;
            }
            let moved = merge(moved);
            let mut base = week[day.weekday().to_monday_zero_offset() as usize].clone();
            let mut gaps = Vec::new();
            for &(_, s, e) in edits.removed.iter().filter(|r| r.0 == day) {
                base = subtract(&base, s, e);
                cap = cap.saturating_sub(e - s);
                gaps.push((e, e + BREAK_MINUTES));
            }
            full_windows = merge(moved.iter().copied().chain(base.iter().copied()).collect());
            full_windows.sort();
            // A moved block keeps its dropped time; the usual windows give way around it.
            gaps.extend(
                moved
                    .iter()
                    .map(|&(s, e)| (s.saturating_sub(BREAK_MINUTES), e + BREAK_MINUTES)),
            );
            for (s, e) in gaps {
                base = subtract(&base, s, e.min(DAY_MINUTES));
            }
            moved_wins = moved;
            windows = merge(base);
        } else {
            cap = 0;
        }
        // Interview days: a short review warm-up that ends an hour before a known start
        // time, and nothing when the time isn't set.
        match iv_days.get(&day).copied() {
            Some(Some(t)) => {
                let until = t.saturating_sub(WARMUP_GAP_MINUTES);
                windows = subtract(&windows, until, DAY_MINUTES);
                moved_wins = subtract(&moved_wins, until, DAY_MINUTES);
                full_windows = subtract(&full_windows, until, DAY_MINUTES);
                cap = cap.min(WARMUP_MINUTES);
            }
            Some(None) => {
                windows.clear();
                moved_wins.clear();
                full_windows.clear();
                cap = 0;
            }
            None => {}
        }
        for (s, e) in busy_on(day, &settings.busy, tz) {
            windows = subtract(&windows, s, e);
            moved_wins = subtract(&moved_wins, s, e);
            full_windows = subtract(&full_windows, s, e);
        }
        let day_cap = cap;
        if day == today {
            let clip = |ws: Vec<(u32, u32)>| -> Vec<(u32, u32)> {
                ws.into_iter()
                    .filter_map(|(s, e)| (s.max(now_minute) < e).then_some((s.max(now_minute), e)))
                    .collect()
            };
            windows = clip(windows);
            moved_wins = clip(moved_wins);
            cap = cap.saturating_sub(used_today);
        }
        let moved_room: u32 = moved_wins.iter().map(|(s, e)| e - s).sum();
        let room: u32 = windows.iter().map(|(s, e)| e - s).sum::<u32>() + moved_room;
        cap = cap.min(room);
        let mut chosen: Vec<Chosen> = Vec::new();
        let mut used = 0;
        // The first item of a day may run past the budget, or a long problem could
        // never be planned on a short budget.
        let fits = |used: u32, m: u32| used + m <= cap || (used == 0 && cap > 0 && m <= room);
        let days_left = upcoming
            .iter()
            .find(|d| **d >= day)
            .map(|d| days_between(day, *d));
        let review_only = days_left.is_some_and(|n| n <= REVIEW_ONLY_DAYS);
        // Reviews leave room for one new problem, so every day mixes the two.
        let review_cap = if review_only || cap < NEW_RESERVE_MIN_CAP {
            cap
        } else {
            cap - NEW_RESERVE_MINUTES
        };
        let fits_review =
            |used: u32, m: u32| used + m <= review_cap || (used == 0 && cap > 0 && m <= room);

        // 1. Due reviews, most overdue first. Ones that don't fit roll to the next day.
        let mut due: Vec<(i64, usize, Sim)> = sim
            .iter()
            .filter(|(_, s)| s.due <= day)
            .map(|(&p, s)| (days_between(s.due, day), p, *s))
            .collect();
        due.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
        let mut today_problems: HashSet<usize> = HashSet::new();
        for (_, pi, s) in due {
            let p = &c.problems()[pi];
            let m = ctx.review_minutes(p);
            if fits_review(used, m) {
                used += m;
                today_problems.insert(pi);
                chosen.push(Chosen {
                    item: ctx.review(p, &s),
                    effect: Effect::Review(pi),
                });
            }
        }

        // 2. Mock interviews: weekly, every few days near the date, and one the day before.
        let near = days_left.is_some_and(|n| n <= NEAR_DAYS);
        let every = if near {
            MOCK_EVERY_DAYS_NEAR
        } else {
            MOCK_EVERY_DAYS
        };
        let since = last_mock.map(|l| days_between(l, day));
        let company_mock = company_mock_on(c, settings, day);
        let final_day = days_left == Some(1);
        let mock_minutes = ceil_minutes(interview::ROUND_LENGTH);
        if sim.len() >= MOCK_MIN_SEEN
            && (since.is_none_or(|s| s >= every)
                || ((final_day || company_mock.is_some()) && since != Some(0)))
            && fits(used, mock_minutes)
        {
            used += mock_minutes;
            let reason = match days_left {
                _ if company_mock.is_some() => format!(
                    "Your {} interview is in {COMPANY_MOCK_DAYS} days. A timed mock, so pick {} on the mock page",
                    company_mock.as_deref().unwrap_or_default(),
                    company_mock.as_deref().unwrap_or_default()
                ),
                Some(1) => "The last mock before your interview".to_string(),
                Some(n) if near => format!("Interview in {n} days: a mock every {every} days"),
                _ => format!("Weekly mock: timed, technique hidden, {mock_minutes} min"),
            };
            chosen.push(Chosen {
                item: PlanItem {
                    kind: ItemKind::Mock,
                    tag: Tag::Mock,
                    problem: None,
                    title: company_mock
                        .as_ref()
                        .map_or("Mock interview".into(), |n| format!("{n} mock interview")),
                    technique: None,
                    minutes: mock_minutes,
                    reason,
                    note: None,
                    chips: vec![chip("timer", "Timed like the real thing".into())],
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
                    tag: Tag::Check,
                    problem: None,
                    title: "Check-in".into(),
                    technique: None,
                    minutes: CHECKPOINT_MINUTES,
                    reason: format!("{passes_since} passes since the last check-in"),
                    note: None,
                    chips: vec![chip("list-checks", "Is it sticking?".into())],
                },
                effect: Effect::Checkpoint,
            });
        }

        // 4. New problems: techniques below their goal first, then by priority.
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
                            tag: ctx.weak_or(p, Tag::Progress),
                            problem: None,
                            title: format!("Re-read: {}", c.technique_of(p).title),
                            technique: Some(c.technique_of(p).title.clone()),
                            minutes: NOTE_MINUTES,
                            reason: reason.clone(),
                            note: Some(path.clone()),
                            chips: vec![chip("book-open", "Re-read the note first".into())],
                        },
                        effect: Effect::Note(ti),
                    });
                }
                used += m + note_m;
                techs[ti].queue.pop_front();
                placed_new += 1;
                today_problems.insert(pi);
                chosen.push(Chosen {
                    item: ctx.new_item(p, &weak_mods),
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
                let mut item = ctx.item(
                    ItemKind::Drill,
                    ctx.weak_or(p, Tag::Progress),
                    p,
                    m,
                    action.reason.clone(),
                );
                push_chip(
                    &mut item.chips,
                    match action.kind {
                        ActionKind::EdgeCaseRedo => {
                            Some(chip("crosshair", "Edge-case drill".into()))
                        }
                        ActionKind::TimedRep => Some(chip("timer", "Timed rep".into())),
                        ActionKind::SpacedRedo => Some(chip("repeat", "Spaced redo".into())),
                        _ => None,
                    },
                );
                push_chip(&mut item.chips, ctx.company_chip(p));
                chosen.push(Chosen {
                    item,
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
                let ago = days_between(last, day);
                let reason = match ctx.company(p) {
                    Some((co, _)) => {
                        format!("{co} leans on {}; last done {ago} days ago", ctx.tech(p))
                    }
                    None => format!("Last done {ago} days ago"),
                };
                let mut item = ctx.item(ItemKind::Drill, Tag::Sharp, p, m, reason);
                item.chips.push(chip("rotate-ccw", "Keep sharp".into()));
                push_chip(&mut item.chips, ctx.company_chip(p));
                chosen.push(Chosen {
                    item,
                    effect: Effect::Drill(pi),
                });
            }
        }

        // Pack into sessions; only what fits takes effect, the rest rolls forward.
        let minutes: Vec<u32> = chosen.iter().map(|ch| ch.item.minutes).collect();
        // Moved blocks take the trailing items, so the usual sessions keep their leading ones.
        let mut split = minutes.len();
        if !moved_wins.is_empty() {
            let mut tail = 0;
            while split > 0 && (split == minutes.len() || tail + minutes[split - 1] <= moved_room) {
                tail += minutes[split - 1];
                split -= 1;
            }
        }
        let (mut slots, fitted) = pack(&windows, &minutes[..split], session_minutes);
        let (more, extra) = pack(&moved_wins, &minutes[fitted..], session_minutes);
        slots.extend(
            more.into_iter()
                .map(|(s, e, idx)| (s, e, idx.into_iter().map(|i| i + fitted).collect())),
        );
        slots.sort_by_key(|s| s.0);
        let fitted = fitted + extra;
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
                        // The forecast reads "by the interview", so later days don't count.
                        if interview.is_none_or(|iv| day < iv) {
                            techs[ti].placed += 1;
                        }
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
            interleave(&mut items);
            let minutes = items.iter().map(|i| i.minutes).sum();
            let moved_from = moved_in
                .iter()
                .find(|&&(ms, me, _)| ms <= s && s < me)
                .map(|m| m.2.to_string());
            sessions.push(Session {
                id: format!("{day}-{}", n + 1),
                start_ms: local_ts(day, s, tz).as_millisecond(),
                end_ms: local_ts(day, e, tz).as_millisecond(),
                minutes,
                title: session_title(&items),
                items,
                moved_from,
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
            cap: day_cap,
            off,
            windows: full_windows
                .iter()
                .map(|&(s, e)| Span {
                    start: hhmm(s),
                    end: hhmm(e),
                })
                .collect(),
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
            mastered_now: tech
                .problems
                .iter()
                .filter(|&&i| {
                    states
                        .get(&c.problems()[i].id)
                        .is_some_and(|st| st.status == Status::Mastered)
                })
                .count(),
            projected,
            status: if behind_by == 0 { "on_track" } else { "behind" }.into(),
            behind_by,
            mastery: s.mastery,
            confidence: s.confidence,
            cause: s.cause,
        });
    }
    // A chip for items whose technique ends the plan short.
    if let Some(date) = interview {
        let short: HashMap<(&str, &str), &Coverage> = forecast
            .iter()
            .filter(|f| f.behind_by > 0)
            .map(|f| ((f.module.as_str(), f.technique.as_str()), f))
            .collect();
        for it in days
            .iter_mut()
            .flat_map(|d| &mut d.sessions)
            .flat_map(|s| &mut s.items)
        {
            let Some(p) = it.problem.as_deref().and_then(|id| c.problem(id)) else {
                continue;
            };
            let key = (c.module_of(p).id.as_str(), c.technique_of(p).id.as_str());
            if let Some(f) = short.get(&key) {
                let text = format!(
                    "{} behind by {} at {}",
                    f.title,
                    f.behind_by,
                    date.strftime("%b %-d")
                );
                push_chip(&mut it.chips, Some(chip("flag", text)));
            }
        }
    }
    let summary = summarize(&days, &forecast, today, interview);
    Ok(Plan {
        version: 1,
        generated_ms: now.as_millisecond(),
        tz: tz_name.to_string(),
        start: today.to_string(),
        end: days.last().map_or(today.to_string(), |d| d.date.clone()),
        interview_date: interview.map(|d| d.to_string()),
        interviews: settings
            .interviews
            .iter()
            .filter(|i| i.date >= today.to_string())
            .map(|i| Interview {
                name: i.company.as_deref().and_then(|s| company_name(c, s)),
                ..i.clone()
            })
            .collect(),
        pace,
        days,
        forecast,
        summary,
        notes: Vec::new(),
    })
}

fn weekday_long(d: Date) -> &'static str {
    [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ][d.weekday().to_monday_zero_offset() as usize]
}

/// "today", "tomorrow", "Sunday" (this week) or "Nov 23".
fn day_name(d: Date, today: Date) -> String {
    match days_between(today, d) {
        0 => "today".into(),
        1 => "tomorrow".into(),
        2..=6 => weekday_long(d).into(),
        _ => d.strftime("%b %-d").to_string(),
    }
}

/// "a", "a and b", "a, b and c".
fn and_list(xs: &[String]) -> String {
    match xs {
        [] => String::new(),
        [a] => a.clone(),
        [rest @ .., last] => format!("{} and {last}", rest.join(", ")),
    }
}

fn status_text(behind: usize) -> String {
    if behind == 0 {
        "on track".into()
    } else {
        format!("behind by {behind}")
    }
}

/// "Graphs moved from behind by 2 to behind by 1." for every technique that changed.
fn forecast_changes(before: &[Coverage], after: &[Coverage]) -> Vec<String> {
    after
        .iter()
        .filter_map(|a| {
            let b = before
                .iter()
                .find(|b| (&b.module, &b.technique) == (&a.module, &a.technique))?;
            (b.behind_by != a.behind_by).then(|| {
                format!(
                    "{} moved from {} to {}",
                    a.title,
                    status_text(b.behind_by),
                    status_text(a.behind_by)
                )
            })
        })
        .collect()
}

/// The days the plan first reviews these problems on, in date order.
fn review_days(plan: &Plan, problems: &HashSet<&str>) -> Vec<Date> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for d in &plan.days {
        let mut hit = false;
        for p in d
            .sessions
            .iter()
            .flat_map(|s| &s.items)
            .filter(|i| i.kind == ItemKind::Review)
            .filter_map(|i| i.problem.as_deref())
            .filter(|p| problems.contains(p))
        {
            hit |= seen.insert(p);
        }
        if hit && let Ok(date) = d.date.parse() {
            out.push(date);
        }
    }
    out
}

/// The interview's company, for copy: the first target company's playlist title.
fn company_title(c: &Catalog, settings: &Settings) -> Option<String> {
    company_name(
        c,
        next_company(settings).or(settings.target_companies.first())?,
    )
}

/// The company whose interview is `COMPANY_MOCK_DAYS` after `day`: that day gets its mock.
fn company_mock_on(c: &Catalog, settings: &Settings, day: Date) -> Option<String> {
    settings
        .interviews
        .iter()
        .filter_map(|iv| Some((iv.company.as_deref()?, iv.date.parse::<Date>().ok()?)))
        .find(|(_, d)| days_between(day, *d) == COMPANY_MOCK_DAYS)
        .and_then(|(slug, _)| company_name(c, slug))
}

/// The company of the interview the plan paces toward, if it names one.
fn next_company(settings: &Settings) -> Option<&String> {
    settings
        .interviews
        .iter()
        .find(|i| Some(&i.date) == settings.interview_date.as_ref())
        .and_then(|i| i.company.as_ref())
}

fn company_name(c: &Catalog, slug: &str) -> Option<String> {
    c.playlists
        .iter()
        .find(|pl| company_slug(&pl.id) == slug || pl.id == slug)
        .map(|pl| pl.title.clone())
}

const BACKLOG_REVIEWS: usize = 20;
const CRAM_DAYS: i64 = 7;
const GREAT_DAY_EXTRA: usize = 2;
const AWAY_DAYS: i64 = 3;

/// What changed since yesterday's plan, newest first. Never adds load or blame; each
/// note says what moved, in counts, and what it means for the date.
fn notes(
    c: &Catalog,
    events: &[Event],
    settings: &Settings,
    now: Timestamp,
    tz: &TimeZone,
    plan: &Plan,
) -> Vec<Note> {
    let today = local_day(now, tz);
    let mut out = Vec::new();
    let interview = settings
        .interview_date
        .as_deref()
        .and_then(|d| d.parse::<Date>().ok());
    let who = company_title(c, settings).map_or("Your interview".to_string(), |t| {
        format!("Your {t} interview")
    });
    if let Some(d) = interview.filter(|d| *d <= today) {
        let title = if d == today {
            format!("{who} is today.")
        } else {
            format!("{who} was {}. How did it go?", d.strftime("%b %-d"))
        };
        // On the day itself the interview hasn't happened yet, so the note wishes luck.
        let (body, set_label) = if d == today {
            (
                "Good luck! When it's done, add your next interview to plan toward it, or keep practicing on a rolling four weeks.",
                "Add your next interview",
            )
        } else {
            (
                "Set a new date to plan toward it, or keep practicing on a rolling four weeks.",
                "Set a new date",
            )
        };
        out.push(Note {
            kind: "date_passed".into(),
            title,
            body: body.into(),
            actions: vec![
                NoteAction {
                    kind: "set_date".into(),
                    label: set_label.into(),
                    value: None,
                },
                NoteAction {
                    kind: "clear_date".into(),
                    label: "Keep practicing without a date".into(),
                    value: None,
                },
            ],
        });
    }
    if let Some(n) = plan.summary.days_left.filter(|n| *n < CRAM_DAYS) {
        let left = if n == 1 {
            "1 day to go.".to_string()
        } else {
            format!("{n} days to go.")
        };
        out.push(Note {
            kind: "cram".into(),
            title: left,
            // Inside the review-only tail, mocks and "new topics stop" no longer apply.
            body: if n <= REVIEW_ONLY_DAYS {
                "From here it's reviews only, to keep what you already know fresh.".to_string()
            } else {
                format!(
                    "The plan is mostly reviews now, with a mock every {MOCK_EVERY_DAYS_NEAR} days. New topics stop {REVIEW_ONLY_DAYS} days before."
                )
            },
            actions: Vec::new(),
        });
    }

    let target = |id: &str| c.problem(id).map_or(SignedDuration::ZERO, target_of);
    let attempts = schedule::attempts(events, target);
    let finished_on = |d: Date| {
        attempts
            .iter()
            .filter(|a| a.outcome != Outcome::None && a.end.is_some_and(|e| local_day(e, tz) == d))
            .collect::<Vec<_>>()
    };
    let last = attempts
        .iter()
        .filter(|a| a.outcome != Outcome::None)
        .filter_map(|a| a.end)
        .max()
        .map(|t| local_day(t, tz));
    let states = schedule::compute(events, target, tz);
    // Due today counts too, so the away note's number matches Today's review count.
    let overdue: HashSet<&str> = states
        .iter()
        .filter(|(_, st)| {
            st.status != Status::Unseen && st.due.is_some_and(|t| local_day(t, tz) <= today)
        })
        .map(|(id, _)| id.as_str())
        .collect();
    let yesterday = add_days(today, -1);
    // Yesterday's plan as it stood that morning, from the history before it.
    let yesterday_plan = || {
        let start = yesterday.to_zoned(tz.clone()).ok()?.timestamp();
        let before: Vec<Event> = events.iter().filter(|e| e.time < start).cloned().collect();
        build(c, &before, settings, start, tz, "").ok()
    };
    let gap = last.map(|l| days_between(l, today));
    match gap {
        Some(g) if g >= AWAY_DAYS => {
            let since = add_days(last.expect("gap"), 1);
            let when = if days_between(since, today) <= 6 {
                weekday_long(since).to_string()
            } else {
                since.strftime("%b %-d").to_string()
            };
            let body = match (overdue.len(), review_days(plan, &overdue).last()) {
                (0, _) | (_, None) => {
                    "Nothing is overdue, so the plan carries on where you left off.".to_string()
                }
                (n, Some(end)) => format!(
                    "{n} {} spread over the next {} days, and no day goes past your daily time.",
                    if n == 1 { "review is" } else { "reviews are" },
                    days_between(today, *end) + 1
                ),
            };
            out.push(Note {
                kind: "away".into(),
                title: format!("You've been away since {when}."),
                body,
                actions: Vec::new(),
            });
        }
        Some(2) => {
            if let Some(yp) = yesterday_plan()
                && yp
                    .days
                    .first()
                    .is_some_and(|d| d.date == yesterday.to_string() && !d.sessions.is_empty())
            {
                let missed: HashSet<&str> = yp.days[0]
                    .sessions
                    .iter()
                    .flat_map(|s| &s.items)
                    .filter(|i| i.kind == ItemKind::Review)
                    .filter_map(|i| i.problem.as_deref())
                    .filter(|p| overdue.contains(p))
                    .collect();
                let landed = review_days(plan, &missed);
                let mut body = if missed.is_empty() {
                    "Its work moved into the next free windows.".to_string()
                } else {
                    let names: Vec<String> = landed.iter().map(|d| day_name(*d, today)).collect();
                    let n = missed.len();
                    format!(
                        "Its {n} {} moved into {}.",
                        if n == 1 { "review" } else { "reviews" },
                        and_list(&names)
                    )
                };
                if !missed.is_empty()
                    && landed
                        .last()
                        .is_some_and(|d| days_between(yesterday, *d) <= 1)
                {
                    body += " Nothing is more than a day late.";
                }
                let changes = forecast_changes(&yp.forecast, &plan.forecast);
                body += &match (changes.is_empty(), interview.filter(|d| *d > today)) {
                    (true, Some(d)) => {
                        format!(" Your {} forecast didn't change.", d.strftime("%b %-d"))
                    }
                    (true, None) => String::new(),
                    (false, _) => format!(" {}.", and_list(&changes)),
                };
                out.push(Note {
                    kind: "missed".into(),
                    title: format!("{}'s session didn't happen.", weekday_long(yesterday)),
                    body,
                    actions: Vec::new(),
                });
            }
        }
        Some(1) => {
            if let Some(yp) = yesterday_plan()
                && let Some(d0) = yp.days.first().filter(|d| d.date == yesterday.to_string())
            {
                let planned = d0
                    .sessions
                    .iter()
                    .flat_map(|s| &s.items)
                    .filter(|i| i.problem.is_some())
                    .count();
                let done: HashSet<&str> = finished_on(yesterday)
                    .iter()
                    .filter(|a| a.outcome == Outcome::Pass)
                    .map(|a| a.problem.as_str())
                    .collect();
                if planned > 0 && done.len() >= planned + GREAT_DAY_EXTRA {
                    let changes = forecast_changes(&yp.forecast, &plan.forecast);
                    out.push(Note {
                        kind: "great_day".into(),
                        title: format!(
                            "You cleared {} problems yesterday, {} more than planned.",
                            done.len(),
                            done.len() - planned
                        ),
                        body: if changes.is_empty() {
                            "The extra work is counted, so the next days carry less.".into()
                        } else {
                            format!(
                                "The next days carry less, and {}.",
                                skills::mid_sentence(&and_list(&changes))
                            )
                        },
                        actions: Vec::new(),
                    });
                }
            }
        }
        _ => {}
    }

    let due_now: HashSet<&str> = states
        .iter()
        .filter(|(_, st)| {
            st.status != Status::Unseen && st.due.is_some_and(|t| local_day(t, tz) <= today)
        })
        .map(|(id, _)| id.as_str())
        .collect();
    if due_now.len() >= BACKLOG_REVIEWS
        && let Some(end) = review_days(plan, &due_now).last()
    {
        out.push(Note {
            kind: "backlog".into(),
            title: format!("{} reviews are due.", due_now.len()),
            body: format!(
                "The plan spreads them over {} days at your daily time, most overdue first.",
                days_between(today, *end) + 1
            ),
            actions: Vec::new(),
        });
    }
    out
}

/// The smallest weekday budget that closes a technique's gap, from the stepper's values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TechFix {
    pub module: String,
    pub technique: String,
    /// `None`: not reachable at up to `FIX_STEPS`' last value.
    pub weekday_minutes: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Fixes {
    pub techniques: Vec<TechFix>,
    /// One weekday value that closes every gap.
    pub all: Option<u32>,
    /// The over-budget note, when there is an interview date and something is behind.
    pub note: Option<Note>,
}

/// Weekday budgets the daily-time stepper offers.
pub const FIX_STEPS: [u32; 7] = [30, 45, 60, 75, 90, 105, 120];

/// For each technique the plan leaves short, the weekday budget that would close it.
/// Re-plans once per stepper value above the current one; weekends stay as they are.
pub fn fixes(
    c: &Catalog,
    events: &[Event],
    settings: &Settings,
    now: Timestamp,
    tz: &TimeZone,
) -> Result<Fixes, String> {
    let settings = &settings.resolved(local_day(now, tz));
    let base = build(c, events, settings, now, tz, "")?;
    let behind: Vec<&Coverage> = base.forecast.iter().filter(|f| f.behind_by > 0).collect();
    if behind.is_empty() {
        return Ok(Fixes::default());
    }
    let mut out = Fixes {
        techniques: behind
            .iter()
            .map(|f| TechFix {
                module: f.module.clone(),
                technique: f.technique.clone(),
                weekday_minutes: None,
            })
            .collect(),
        all: None,
        note: None,
    };
    let weekend = settings.weekend_minutes.unwrap_or(settings.daily_minutes);
    for m in FIX_STEPS
        .into_iter()
        .filter(|m| *m > settings.daily_minutes)
    {
        let s = Settings {
            daily_minutes: m,
            weekend_minutes: Some(weekend),
            ..settings.clone()
        };
        let p = build(c, events, &s, now, tz, "")?;
        let short = |t: &TechFix| {
            p.forecast
                .iter()
                .find(|f| (&f.module, &f.technique) == (&t.module, &t.technique))
                .is_some_and(|f| f.behind_by > 0)
        };
        for t in out
            .techniques
            .iter_mut()
            .filter(|t| t.weekday_minutes.is_none())
        {
            if !short(t) {
                t.weekday_minutes = Some(m);
            }
        }
        if out.techniques.iter().all(|t| !short(t)) {
            out.all = Some(m);
            break;
        }
    }
    if let Some(date) = base
        .interview_date
        .as_deref()
        .and_then(|d| d.parse::<Date>().ok())
    {
        let shorts: Vec<String> = behind
            .iter()
            .take(3)
            .enumerate()
            .map(|(i, f)| {
                let name = if i == 0 {
                    f.title.clone()
                } else {
                    skills::mid_sentence(&f.title)
                };
                if i == 0 {
                    format!("{name} would end {} short", f.behind_by)
                } else {
                    format!("{name} {} short", f.behind_by)
                }
            })
            .collect();
        let them = if behind.len() == 1 {
            "it"
        } else if behind.len() == 2 {
            "both"
        } else {
            "all of them"
        };
        let tail = match out.all {
            Some(m) => format!("About {} on weekdays covers {them}.", fmt_minutes(m)),
            None => format!(
                "Even {} on weekdays doesn't close {}; another window or more weekend time would.",
                fmt_minutes(FIX_STEPS[FIX_STEPS.len() - 1]),
                if behind.len() == 1 { "it" } else { "them" }
            ),
        };
        let mut actions = Vec::new();
        if let Some(m) = out.all {
            actions.push(NoteAction {
                kind: "weekday_minutes".into(),
                label: format!("Use {}", fmt_minutes(m)),
                value: Some(m),
            });
        }
        actions.push(NoteAction {
            kind: "availability".into(),
            label: "Add a window".into(),
            value: None,
        });
        out.note = Some(Note {
            kind: "over_budget".into(),
            title: format!(
                "At {} on weekdays, the plan can't reach every target by {}.",
                fmt_minutes(settings.daily_minutes),
                date.strftime("%b %-d")
            ),
            body: format!(
                "Reviews still come first and none are dropped. {}. {tail}",
                and_list(&shorts)
            ),
            actions,
        });
    }
    Ok(out)
}

/// A session opens with one warm-up review, then the new problem, then the rest, so new
/// work isn't always saved for last after a run of reviews.
fn interleave(items: &mut Vec<PlanItem>) {
    let first_new = items.iter().position(|i| i.kind == ItemKind::New);
    if let Some(at) = first_new
        && at > 1
        && items[0].kind == ItemKind::Review
    {
        let it = items.remove(at);
        items.insert(1, it);
    }
}

fn summarize(all: &[Day], forecast: &[Coverage], today: Date, interview: Option<Date>) -> Summary {
    // Counts run to the interview; the plan's days after it are practice that carries on.
    let cut = interview.map(|d| d.to_string());
    let days: Vec<&Day> = all
        .iter()
        .filter(|d| cut.as_ref().is_none_or(|c| d.date < *c))
        .collect();
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
            .map(|f| format!("{} (by {})", skills::mid_sentence(&f.title), f.behind_by))
            .collect();
        format!(" Behind on {}.", and_list(&names))
    };
    let count_of =
        |n: usize, one: &str, many: &str| format!("{n} {}", if n == 1 { one } else { many });
    let work: Vec<String> = [
        (new, "new problem", "new problems"),
        (reviews, "review", "reviews"),
        (mocks, "mock interview", "mock interviews"),
    ]
    .into_iter()
    .filter(|(n, ..)| *n > 0)
    .map(|(n, one, many)| count_of(n, one, many))
    .collect();
    let work = if work.is_empty() {
        "nothing planned yet".to_string()
    } else {
        and_list(&work)
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
        headline: format!("{lead}: {work}.{tail}"),
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
    fn fresh_plan_runs_past_the_interview_inside_windows() {
        let s = settings(
            r#"{"interview_date":"2026-11-21","new_per_day":2,"daily_minutes":60,"session_minutes":45,
                "availability":[{"days":["mon","tue","wed","thu","fri"],"start":"19:00","end":"20:30"},
                                {"days":["sat"],"start":"10:00","end":"12:00"}],
                "days_off":["2026-11-17"]}"#,
        );
        // Saturday 2026-11-14, 08:00: today's Saturday window is still ahead.
        let p = run(&[], &s, at(11, 14, 8));
        // Four weeks, past the interview: practice carries on after it.
        assert_eq!(
            (p.start.as_str(), p.end.as_str()),
            ("2026-11-14", "2026-12-11")
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
            review.1.reason.contains("just learned"),
            "{}",
            review.1.reason
        );
        // Read today, a later day's review says when it comes due, never "Due today".
        assert!(
            review.1.reason.starts_with("Due tomorrow"),
            "{}",
            review.1.reason
        );
        // Nothing new in the last 2 days before the interview.
        // Nothing new in the last 2 days before the interview, nothing on the day, and new
        // problems again after it.
        assert!(
            items
                .iter()
                .all(|(d, i)| i.kind != ItemKind::New || *d < "2026-11-19" || *d > "2026-11-21"),
            "review-only tail"
        );
        assert!(by_date["2026-11-21"].sessions.is_empty(), "interview day");
        assert!(
            items
                .iter()
                .any(|(d, i)| i.kind == ItemKind::New && *d > "2026-11-21"),
            "new problems after the interview"
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
            first_day[0].reason.contains("days ago"),
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
        // Two attempts are a first read: a warm-up, never a "weak spot" tag yet.
        assert!(
            first_new.1.reason.contains("easiest"),
            "{}",
            first_new.1.reason
        );
        assert_eq!(first_new.1.tag, Tag::New);
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
            first_new
                .1
                .reason
                .contains("shows up in one of Meta's problems"),
            "{}",
            first_new.1.reason
        );
        assert_eq!(p.forecast.len(), 1, "only Meta's techniques have goals");
        assert_eq!(p.forecast[0].status, "on_track");
        assert_eq!(p.forecast[0].companies, vec!["Meta".to_string()]);
    }

    #[test]
    fn focus_topics_lead_new_work_alongside_companies() {
        // Beta comes last in reading order; a focus on it brings it first.
        let p = run(
            &[],
            &settings(r#"{"focus_topics":["beta"],"new_per_day":1}"#),
            at(11, 14, 8),
        );
        let first_new = all_items(&p)
            .into_iter()
            .find(|(_, i)| i.kind == ItemKind::New)
            .unwrap();
        assert_eq!(first_new.1.problem.as_deref(), Some("two-sum"));
        assert!(
            first_new
                .1
                .reason
                .contains("You picked beta as a focus topic"),
            "{}",
            first_new.1.reason
        );
        // With a company, a focus topic it never touches still gets a goal.
        let s = settings(r#"{"target_companies":["meta"],"focus_topics":["alpha"]}"#);
        let p = run(&[], &s, at(11, 14, 8));
        let mut techs: Vec<&str> = p.forecast.iter().map(|f| f.technique.as_str()).collect();
        techs.sort_unstable();
        assert_eq!(techs, ["one", "three", "two"]);
        // An unknown topic changes nothing.
        let a = run(
            &[],
            &settings(r#"{"focus_topics":["nope"]}"#),
            at(11, 14, 8),
        );
        let b = run(&[], &Settings::default(), at(11, 14, 8));
        assert_eq!(
            serde_json::to_string(&a.days).unwrap(),
            serde_json::to_string(&b.days).unwrap()
        );
    }

    #[test]
    fn the_last_days_note_says_reviews_only() {
        let s = settings(r#"{"interviews":[{"date":"2026-11-15","company":"meta"}]}"#);
        let p = run(&[], &s, at(11, 14, 8));
        let n = p
            .notes
            .iter()
            .find(|n| n.kind == "cram")
            .expect("a cram note");
        assert!(
            n.body.starts_with("From here it's reviews only"),
            "{}",
            n.body
        );
    }

    #[test]
    fn a_session_puts_the_new_problem_after_one_warm_up_review() {
        let it = |kind: ItemKind, title: &str| PlanItem {
            kind,
            tag: Tag::default(),
            problem: None,
            title: title.into(),
            technique: None,
            minutes: 10,
            reason: String::new(),
            note: None,
            chips: Vec::new(),
        };
        let mut items = vec![
            it(ItemKind::Review, "r1"),
            it(ItemKind::Review, "r2"),
            it(ItemKind::Review, "r3"),
            it(ItemKind::New, "n1"),
        ];
        interleave(&mut items);
        let order: Vec<&str> = items.iter().map(|i| i.title.as_str()).collect();
        assert_eq!(order, ["r1", "n1", "r2", "r3"]);
    }

    #[test]
    fn an_interview_with_a_time_gets_a_short_warm_up_before_it() {
        let s = settings(
            r#"{"interviews":[{"date":"2026-11-16","company":"meta","time":"14:00"}],
                "availability":[{"days":["mon","tue","wed","thu","fri","sat","sun"],"start":"09:00","end":"17:00"}]}"#,
        );
        let p = run(&[], &s, at(11, 14, 8));
        let day = p.days.iter().find(|d| d.date == "2026-11-16").unwrap();
        assert!(day.minutes <= WARMUP_MINUTES, "{} minutes", day.minutes);
        let cutoff = jiff::civil::date(2026, 11, 16)
            .at(13, 0, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp()
            .as_millisecond();
        assert!(
            day.sessions.iter().all(|x| x.end_ms <= cutoff),
            "ends an hour before"
        );
        assert!(
            day.sessions
                .iter()
                .flat_map(|x| &x.items)
                .all(|i| i.kind == ItemKind::Review),
            "reviews only"
        );
    }

    #[test]
    fn an_interview_today_gets_a_good_luck_note() {
        let s = settings(r#"{"interviews":[{"date":"2026-11-14","company":"meta"}]}"#);
        let p = run(&[], &s, at(11, 14, 8));
        let n = p
            .notes
            .iter()
            .find(|n| n.kind == "date_passed")
            .expect("a note on the interview day");
        assert!(n.title.ends_with("is today."), "{}", n.title);
        assert!(n.body.starts_with("Good luck!"), "{}", n.body);
        assert_eq!(n.actions[0].label, "Add your next interview");
    }

    #[test]
    fn an_interview_today_stays_a_target_while_the_plan_paces_to_the_next() {
        let s = settings(
            r#"{"interviews":[{"date":"2026-11-14","company":"meta"},{"date":"2026-12-20","company":"stripe"}],
                "target_companies":["google"]}"#,
        );
        let r = s.resolved(jiff::civil::date(2026, 11, 14));
        assert_eq!(r.interview_date.as_deref(), Some("2026-12-20"));
        assert!(r.target_companies.contains(&"meta".to_string()));
        let only = settings(r#"{"interviews":[{"date":"2026-11-14","company":"meta"}]}"#);
        let r = only.resolved(jiff::civil::date(2026, 11, 14));
        assert_eq!(r.interview_date.as_deref(), Some("2026-11-14"));
    }

    #[test]
    fn two_interviews_pace_to_the_nearest_and_add_both_companies() {
        let s = settings(
            r#"{"interviews":[{"date":"2026-12-20","company":"stripe"},{"date":"2026-11-21","company":"meta"}],
                "target_companies":["stripe"],"new_per_day":2}"#,
        );
        let p = run(&[], &s, at(11, 14, 8));
        assert_eq!(p.interview_date.as_deref(), Some("2026-11-21"));
        assert_eq!(p.summary.days_left, Some(7));
        let flags: Vec<_> = p
            .interviews
            .iter()
            .map(|i| (i.date.as_str(), i.company.as_deref()))
            .collect();
        assert_eq!(
            flags,
            [("2026-11-21", Some("meta")), ("2026-12-20", Some("stripe"))]
        );
        // Meta was not a target: its set now shapes the plan.
        let first_new = all_items(&p)
            .into_iter()
            .find(|(_, i)| i.kind == ItemKind::New)
            .unwrap();
        assert!(
            first_new.1.reason.contains("Meta"),
            "{}",
            first_new.1.reason
        );
        assert!(p.notes.iter().all(|n| n.kind != "date_passed"));

        let c = good_catalog();
        let s2 = s.resolved(Date::constant(2026, 11, 14));
        let mock = |m, d| company_mock_on(&c, &s2, Date::constant(2026, m, d));
        assert_eq!(mock(11, 18).as_deref(), Some("Meta"));
        assert_eq!(mock(12, 17).as_deref(), Some("Stripe"));
        assert_eq!(mock(11, 19), None);

        // After Meta passes, pace moves on to Stripe and the Meta flag drops.
        let later = run(&[], &s, at(11, 22, 8));
        assert_eq!(later.interview_date.as_deref(), Some("2026-12-20"));
        assert_eq!(later.interviews.len(), 1);
    }

    #[test]
    fn a_single_date_still_works_as_one_interview() {
        let r =
            settings(r#"{"interview_date":"2026-11-21"}"#).resolved(Date::constant(2026, 11, 14));
        assert_eq!(r.interviews.len(), 1);
        assert_eq!(r.interviews[0].company, None);
        assert_eq!(r, r.resolved(Date::constant(2026, 11, 14)), "idempotent");
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
            .find(|(_, i)| {
                i.kind == ItemKind::Drill && i.chips.iter().any(|c| c.text == "Timed rep")
            })
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

    const WINDOWS: &str = r#""availability":[{"days":["mon","tue","wed","thu","fri"],"start":"19:00","end":"21:00"},
                {"days":["sat","sun"],"start":"10:00","end":"13:00"}]"#;

    #[test]
    fn weekend_budget_and_day_overrides() {
        let s = settings(&format!(
            r#"{{"daily_minutes":30,"weekend_minutes":120,"day_minutes":{{"2026-11-16":15}},{WINDOWS}}}"#
        ));
        let p = run(&[], &s, at(11, 14, 8));
        let day = |d: &str| p.days.iter().find(|x| x.date == d).unwrap();
        assert_eq!((day("2026-11-14").cap, day("2026-11-15").cap), (120, 120));
        assert_eq!(day("2026-11-16").cap, 15, "a shorter day");
        assert_eq!(day("2026-11-17").cap, 30);
        assert_eq!(
            day("2026-11-17").windows,
            vec![Span {
                start: "19:00".into(),
                end: "21:00".into()
            }]
        );
        let off = settings(&format!(r#"{{"days_off":["2026-11-17"],{WINDOWS}}}"#));
        let p = run(&[], &off, at(11, 14, 8));
        let d = p.days.iter().find(|x| x.date == "2026-11-17").unwrap();
        assert!(d.off && d.rest && d.cap == 0 && d.windows.is_empty());
    }

    fn busy(blocks: &[(Timestamp, Timestamp)]) -> String {
        let b: Vec<Busy> = blocks
            .iter()
            .map(|(s, e)| Busy {
                start_ms: s.as_millisecond(),
                end_ms: e.as_millisecond(),
            })
            .collect();
        format!(r#""busy":{}"#, serde_json::to_string(&b).unwrap())
    }

    fn overlaps(s: &Session, (a, b): (Timestamp, Timestamp)) -> bool {
        s.start_ms < b.as_millisecond() && a.as_millisecond() < s.end_ms
    }

    #[test]
    fn sessions_never_overlap_a_busy_block() {
        // Tuesday 19:00 to 21:00 has a 19:30 to 20:15 meeting.
        let meeting = (
            at(11, 17, 19) + SignedDuration::from_mins(30),
            at(11, 17, 20) + SignedDuration::from_mins(15),
        );
        let s = settings(&format!(
            r#"{{"daily_minutes":90,{},{WINDOWS}}}"#,
            busy(&[meeting])
        ));
        let p = run(&[], &s, at(11, 14, 8));
        let tue = p.days.iter().find(|d| d.date == "2026-11-17").unwrap();
        assert!(
            !tue.sessions.is_empty(),
            "the free time around it is still used"
        );
        assert!(tue.sessions.iter().all(|x| !overlaps(x, meeting)));
        assert_eq!(
            tue.windows,
            vec![
                Span {
                    start: "19:00".into(),
                    end: "19:30".into()
                },
                Span {
                    start: "20:15".into(),
                    end: "21:00".into()
                }
            ]
        );
        assert!(
            p.days
                .iter()
                .flat_map(|d| &d.sessions)
                .all(|x| !overlaps(x, meeting))
        );
    }

    #[test]
    fn a_fully_busy_day_gets_no_sessions() {
        // An all-day block on Wednesday, local midnight to midnight.
        let day = (at(11, 18, 0), at(11, 19, 0));
        let s = settings(&format!(
            r#"{{"daily_minutes":60,{},{WINDOWS}}}"#,
            busy(&[day])
        ));
        let p = run(&[], &s, at(11, 14, 8));
        let wed = p.days.iter().find(|d| d.date == "2026-11-18").unwrap();
        assert!(wed.sessions.is_empty() && wed.rest && wed.windows.is_empty());
        let thu = p.days.iter().find(|d| d.date == "2026-11-19").unwrap();
        assert!(!thu.sessions.is_empty(), "the next day is untouched");
    }

    #[test]
    fn busy_blocks_at_the_window_edges() {
        // Ends as the window opens, starts as it closes: both leave 19:00 to 21:00 free.
        let before = (at(11, 17, 18), at(11, 17, 19));
        let after = (at(11, 17, 21), at(11, 17, 22));
        let s = settings(&format!(
            r#"{{"daily_minutes":60,{},{WINDOWS}}}"#,
            busy(&[before, after])
        ));
        let p = run(&[], &s, at(11, 14, 8));
        let tue = p.days.iter().find(|d| d.date == "2026-11-17").unwrap();
        assert_eq!(
            tue.windows,
            vec![Span {
                start: "19:00".into(),
                end: "21:00".into()
            }]
        );
        assert_eq!(tue.sessions[0].start_ms, at(11, 17, 19).as_millisecond());
        // Overlapping the start and the end trims the window from both sides.
        let head = (
            at(11, 17, 18),
            at(11, 17, 19) + SignedDuration::from_mins(20),
        );
        let tail = (
            at(11, 17, 20) + SignedDuration::from_mins(40),
            at(11, 17, 23),
        );
        let s = settings(&format!(
            r#"{{"daily_minutes":60,{},{WINDOWS}}}"#,
            busy(&[head, tail])
        ));
        let p = run(&[], &s, at(11, 14, 8));
        let tue = p.days.iter().find(|d| d.date == "2026-11-17").unwrap();
        assert_eq!(
            tue.windows,
            vec![Span {
                start: "19:20".into(),
                end: "20:40".into()
            }]
        );
        assert!(
            tue.sessions
                .iter()
                .all(|x| !overlaps(x, head) && !overlaps(x, tail))
        );
        // A block across midnight covers the end of one day and the start of the next.
        let tz = chicago();
        let late = (at(11, 16, 23), at(11, 17, 1));
        assert_eq!(
            busy_on(
                jiff::civil::date(2026, 11, 16),
                &settings(&format!("{{{}}}", busy(&[late]))).busy,
                &tz
            ),
            vec![(23 * 60, DAY_MINUTES)]
        );
        assert_eq!(
            busy_on(
                jiff::civil::date(2026, 11, 17),
                &settings(&format!("{{{}}}", busy(&[late]))).busy,
                &tz
            ),
            vec![(0, 60)]
        );
        // Unreadable time fails closed: the whole day is busy.
        let bad = [Busy {
            start_ms: i64::MIN,
            end_ms: i64::MAX,
        }];
        assert_eq!(
            busy_on(jiff::civil::date(2026, 11, 17), &bad, &tz),
            vec![(0, DAY_MINUTES)]
        );
    }

    #[test]
    fn a_move_takes_the_time_to_its_new_slot() {
        let base = settings(&format!(r#"{{"daily_minutes":60,{WINDOWS}}}"#));
        let p = run(&[], &base, at(11, 14, 8));
        let tue = p.days.iter().find(|d| d.date == "2026-11-17").unwrap();
        assert_eq!(tue.sessions[0].start_ms, at(11, 17, 19).as_millisecond());
        // Tuesday's 19:00 hour moves to Thursday at 07:00, outside any window.
        let moved = settings(&format!(
            r#"{{"daily_minutes":60,"moves":[{{"from":"2026-11-17","from_start":"19:00","to":"2026-11-19","to_start":"07:00","minutes":60}}],{WINDOWS}}}"#
        ));
        let p = run(&[], &moved, at(11, 14, 8));
        let tue = p.days.iter().find(|d| d.date == "2026-11-17").unwrap();
        let thu = p.days.iter().find(|d| d.date == "2026-11-19").unwrap();
        assert_eq!(tue.cap, 0);
        assert!(tue.sessions.is_empty(), "nothing left on Tuesday");
        assert_eq!(thu.cap, 120, "Thursday carries both hours");
        let first = &thu.sessions[0];
        assert_eq!(first.start_ms, at(11, 19, 7).as_millisecond());
        assert_eq!(first.moved_from.as_deref(), Some("2026-11-17"));
        assert_eq!(
            thu.windows[0],
            Span {
                start: "07:00".into(),
                end: "08:00".into()
            }
        );
        assert!(thu.sessions.iter().skip(1).all(|s| s.moved_from.is_none()));
    }

    #[test]
    fn a_dropped_block_keeps_its_time_and_the_rest_stay_put() {
        let wins = r#""availability":[{"days":["mon","tue","wed","thu","fri"],"start":"18:00","end":"22:00"}]"#;
        let with = |mv: &str| settings(&format!(r#"{{"daily_minutes":120,{mv}{wins}}}"#));
        let tue = |p: &Plan| {
            p.days
                .iter()
                .find(|x| x.date == "2026-11-17")
                .unwrap()
                .clone()
        };
        let before = tue(&run(&[], &with(""), at(11, 14, 8)));
        assert_eq!(before.sessions[0].start_ms, at(11, 17, 18).as_millisecond());
        assert!(before.sessions.len() > 1);
        // Monday's 18:00 block goes to Tuesday 21:00, after Tuesday's own sessions end.
        let drop_at = |hhmm: &str| {
            let mv = format!(
                r#""moves":[{{"from":"2026-11-16","from_start":"18:00","to":"2026-11-17","to_start":"{hhmm}","minutes":25}}],"#
            );
            tue(&run(&[], &with(&mv), at(11, 14, 8)))
        };
        let late = drop_at("21:00");
        let landed = late
            .sessions
            .iter()
            .find(|s| s.moved_from.is_some())
            .unwrap();
        assert_eq!(
            landed.start_ms,
            at(11, 17, 21).as_millisecond(),
            "lands on the dropped time"
        );
        let own: Vec<_> = late
            .sessions
            .iter()
            .filter(|s| s.moved_from.is_none())
            .collect();
        assert!(!own.is_empty());
        assert!(
            own.iter()
                .all(|s| before.sessions.iter().any(|b| b.start_ms == s.start_ms)),
            "Tuesday's other sessions keep their times"
        );
        // Dropped at 19:30, inside the window: lands at 19:30 and the 18:00 session stays.
        let mid = drop_at("19:30");
        let landed = mid
            .sessions
            .iter()
            .find(|s| s.moved_from.is_some())
            .unwrap();
        assert_eq!(
            landed.start_ms,
            at(11, 17, 19).as_millisecond() + 30 * 60_000
        );
        assert_eq!(mid.sessions[0].start_ms, at(11, 17, 18).as_millisecond());
        assert_eq!(
            mid.windows, before.windows,
            "the window still shows unbroken"
        );
    }

    #[test]
    fn items_carry_tags_chips_and_short_reasons() {
        let events = [
            pass("p-one", "a", at(11, 10, 19), 5),
            gave_up("p-two", "b", at(11, 11, 19)),
        ]
        .concat();
        let s = settings(&format!(
            r#"{{"interview_date":"2026-11-30","target_companies":["meta"],"daily_minutes":120,{WINDOWS}}}"#
        ));
        let p = run(&events, &s, at(11, 14, 8));
        for (_, it) in all_items(&p) {
            assert!(it.chips.len() <= 3, "{:?}", it.chips);
            assert!(
                it.reason.chars().next().unwrap().is_uppercase()
                    || it.reason.starts_with(char::is_numeric),
                "{}",
                it.reason
            );
            assert!(
                !it.reason.to_lowercase().starts_with("weak spot"),
                "never repeat the tag: {}",
                it.reason
            );
            match it.kind {
                ItemKind::Review => assert_eq!(it.tag, Tag::Review),
                ItemKind::Mock => assert_eq!(it.tag, Tag::Mock),
                ItemKind::Checkpoint => assert_eq!(it.tag, Tag::Check),
                _ => assert_ne!(it.tag, Tag::Weak, "two attempts never earn a weak tag"),
            }
        }
        let meta = all_items(&p)
            .into_iter()
            .find(|(_, i)| i.problem.as_deref() == Some("two-sum"))
            .unwrap();
        assert!(
            meta.1.chips.iter().any(|c| c.text == "Meta leans on three"),
            "{:?}",
            meta.1.chips
        );
    }

    #[test]
    fn a_missed_day_says_where_its_reviews_went() {
        // Passed two problems on Thursday; both 1-day reviews were due Friday, which was skipped.
        let events = [
            pass("p-one", "a", at(11, 12, 19), 5),
            pass("p-two", "b", at(11, 12, 19), 5),
        ]
        .concat();
        let s = settings(&format!(
            r#"{{"interview_date":"2026-12-07","daily_minutes":60,{WINDOWS}}}"#
        ));
        let p = run(&events, &s, at(11, 14, 8));
        let n = p
            .notes
            .iter()
            .find(|n| n.kind == "missed")
            .expect("missed note");
        assert_eq!(n.title, "Friday's session didn't happen.");
        assert!(
            n.body.starts_with("Its 2 reviews moved into today"),
            "{}",
            n.body
        );
        assert!(
            n.body.contains("Nothing is more than a day late"),
            "{}",
            n.body
        );
    }

    #[test]
    fn away_great_day_cram_and_passed_dates() {
        let s = settings(&format!(r#"{{"daily_minutes":60,{WINDOWS}}}"#));
        let away = run(&pass("p-one", "a", at(11, 3, 19), 5), &s, at(11, 14, 8));
        let n = away.notes.iter().find(|n| n.kind == "away").expect("away");
        assert_eq!(n.title, "You've been away since Nov 4.");
        assert!(n.body.contains("1 review is spread over"), "{}", n.body);

        // Friday's plan (from Thursday's history) held one review; Friday cleared four.
        let mut events = pass("p-one", "a", at(11, 12, 19), 5);
        for (i, id) in ["p-one", "p-two", "p-three", "two-sum"].iter().enumerate() {
            events.extend(pass(id, &format!("f{i}"), at(11, 13, 19), 5));
        }
        let great = run(
            &events,
            &settings(&format!(
                r#"{{"daily_minutes":15,"new_per_day":0,{WINDOWS}}}"#
            )),
            at(11, 14, 8),
        );
        let n = great
            .notes
            .iter()
            .find(|n| n.kind == "great_day")
            .expect("great day");
        assert!(
            n.title
                .starts_with("You cleared 4 problems yesterday, 3 more"),
            "{}",
            n.title
        );

        let cram = run(
            &[],
            &settings(r#"{"interview_date":"2026-11-18"}"#),
            at(11, 14, 8),
        );
        assert!(
            cram.notes
                .iter()
                .any(|n| n.kind == "cram" && n.title == "4 days to go.")
        );

        let passed = run(
            &[],
            &settings(r#"{"interview_date":"2026-11-07","target_companies":["meta"]}"#),
            at(11, 14, 8),
        );
        let n = &passed.notes[0];
        assert_eq!(
            (n.kind.as_str(), n.title.as_str()),
            (
                "date_passed",
                "Your Meta interview was Nov 7. How did it go?"
            )
        );
        assert_eq!(n.actions.len(), 2);
        assert!(
            passed.interview_date.is_none(),
            "the plan rolls on without it"
        );
    }

    #[test]
    fn fixes_name_the_weekday_budget_that_closes_each_gap() {
        let s = settings(&format!(
            r#"{{"interview_date":"2026-11-20","new_per_day":3,"daily_minutes":15,"weekend_minutes":15,{WINDOWS}}}"#
        ));
        let c = good_catalog();
        let f = fixes(&c, &[], &s, at(11, 14, 8), &chicago()).unwrap();
        assert!(!f.techniques.is_empty());
        assert!(
            f.techniques
                .iter()
                .all(|t| t.weekday_minutes.is_none_or(|m| FIX_STEPS.contains(&m)))
        );
        let note = f.note.expect("over-budget note with a date");
        assert!(
            note.title
                .starts_with("At 15 min on weekdays, the plan can't reach every target by Nov 20."),
            "{}",
            note.title
        );
        assert!(
            note.body.starts_with("Reviews still come first"),
            "{}",
            note.body
        );
        if let Some(m) = f.all {
            assert_eq!(note.actions[0].value, Some(m));
            let ok = settings(&format!(
                r#"{{"interview_date":"2026-11-20","new_per_day":3,"daily_minutes":{m},"weekend_minutes":15,{WINDOWS}}}"#
            ));
            assert!(
                run(&[], &ok, at(11, 14, 8)).summary.on_track,
                "the named budget really closes every gap"
            );
        }
        let on_track = fixes(&c, &[], &Settings::default(), at(11, 14, 8), &chicago()).unwrap();
        assert_eq!(on_track, Fixes::default());
    }

    #[test]
    fn company_slugs() {
        assert_eq!(company_slug("001_google"), "google");
        assert_eq!(company_slug("009_salesforce_slack"), "salesforce_slack");
        assert_eq!(company_slug("google"), "google");
    }
}
