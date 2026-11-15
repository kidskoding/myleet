//! What the history says about the learner's habits: when they practise (painted as dots
//! in the availability editor and offered as a suggestion), how fast reviews go, and the
//! short "Noticed this week" insights. Every sentence names two facts from their own
//! attempts; nothing is compared with other people.

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use jiff::civil::Date;
use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};
use serde::{Deserialize, Serialize};

use crate::catalog::Catalog;
use crate::planner::{WEEKDAYS, Window, hhmm};
use crate::progress::Event;
use crate::schedule::{self, Attempt, Outcome, local_day};
use crate::skills;

/// History window for practice times and the suggestion.
pub const HISTORY_DAYS: i64 = 28;
/// Sessions needed before the editor suggests windows.
pub const SUGGEST_SESSIONS: usize = 8;
/// Attempts this close together are one sitting.
const SESSION_GAP: SignedDuration = SignedDuration::from_mins(45);
/// A suggested window covers this share of the sessions' time.
const COVER: f64 = 0.7;
/// Wider than this, practice is too spread out to suggest one window.
const MAX_WINDOW_SLOTS: usize = 8;
const MIN_TREND_ATTEMPTS: usize = 3;
const MIN_HOUR_ATTEMPTS: usize = 5;
const MIN_REVIEW_SAMPLES: usize = 3;

/// `(weekday 0 = Monday, half-hour slot 0..48)` cells practised in the last four weeks.
pub type Cell = (u8, u8);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Suggestion {
    pub windows: Vec<Window>,
    pub sessions: usize,
    /// "You usually practise **9 to 10 pm on weekdays** and **Saturday mornings**, ..."
    pub text: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct History {
    pub sessions: usize,
    pub cells: Vec<Cell>,
    pub suggestion: Option<Suggestion>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Insight {
    pub kind: String,
    /// A Lucide icon name.
    pub icon: String,
    /// Plain text with `**bold**` around the two facts.
    pub text: String,
}

/// "9 pm", "9:30 am", "12 pm"; minutes after midnight, 1440 reads as "12 am".
pub fn clock(m: u32) -> String {
    let (h, min) = ((m / 60) % 24, m % 60);
    let h12 = if h % 12 == 0 { 12 } else { h % 12 };
    let ap = if h < 12 { "am" } else { "pm" };
    if min == 0 {
        format!("{h12} {ap}")
    } else {
        format!("{h12}:{min:02} {ap}")
    }
}

/// "9 to 10:30 pm", "11 am to 1 pm".
pub fn range(s: u32, e: u32) -> String {
    let (a, b) = (clock(s), clock(e));
    match (a.rsplit_once(' '), b.rsplit_once(' ')) {
        (Some((x, ap1)), Some((_, ap2))) if ap1 == ap2 => format!("{x} to {b}"),
        _ => format!("{a} to {b}"),
    }
}

fn finished(c: &Catalog, events: &[Event]) -> Vec<Attempt> {
    let target = |id: &str| {
        c.problem(id).map_or(SignedDuration::ZERO, |p| {
            SignedDuration::try_from(p.time_target).unwrap_or_default()
        })
    };
    let mut out: Vec<Attempt> = schedule::attempts(events, target)
        .into_iter()
        .filter(|a| a.outcome != Outcome::None && a.end.is_some())
        .collect();
    out.sort_by_key(|a| a.start);
    out
}

/// Sittings in the window: (local date, start minute, end minute).
fn sessions(attempts: &[Attempt], now: Timestamp, tz: &TimeZone) -> Vec<(Date, u32, u32)> {
    let since = now - SignedDuration::from_hours(24 * HISTORY_DAYS);
    let mut spans: Vec<(Timestamp, Timestamp)> = Vec::new();
    for a in attempts
        .iter()
        .filter(|a| a.start >= since && a.start <= now)
    {
        let end = a.end.expect("finished");
        match spans.last_mut() {
            Some(last) if a.start.duration_since(last.1) <= SESSION_GAP => last.1 = last.1.max(end),
            _ => spans.push((a.start, end)),
        }
    }
    spans
        .into_iter()
        .map(|(s, e)| {
            let (zs, ze) = (s.to_zoned(tz.clone()), e.to_zoned(tz.clone()));
            let sm = zs.hour() as u32 * 60 + zs.minute() as u32;
            let em = if ze.date() == zs.date() {
                ze.hour() as u32 * 60 + ze.minute() as u32
            } else {
                24 * 60
            };
            (zs.date(), sm, em.max(sm + 1))
        })
        .collect()
}

fn slots(s: u32, e: u32) -> std::ops::Range<u32> {
    s / 30..e.div_ceil(30).min(48)
}

/// The smallest run of half-hours covering `COVER` of the weight, if it is narrow enough.
fn best_run(weight: &[u32; 48]) -> Option<(u32, u32)> {
    let total: u32 = weight.iter().sum();
    if total == 0 {
        return None;
    }
    let mut order: Vec<usize> = (0..48).filter(|&i| weight[i] > 0).collect();
    order.sort_by_key(|&i| (std::cmp::Reverse(weight[i]), i));
    let (mut got, mut lo, mut hi) = (0, 48, 0);
    for i in order {
        got += weight[i];
        lo = lo.min(i);
        hi = hi.max(i + 1);
        if f64::from(got) >= COVER * f64::from(total) {
            break;
        }
    }
    (hi - lo <= MAX_WINDOW_SLOTS).then_some((lo as u32 * 30, hi as u32 * 30))
}

fn part_of_day(s: u32, e: u32) -> Option<&'static str> {
    match (s, e) {
        (s, e) if s >= 5 * 60 && e <= 12 * 60 => Some("mornings"),
        (s, e) if s >= 12 * 60 && e <= 17 * 60 => Some("afternoons"),
        (s, _) if s >= 17 * 60 => Some("evenings"),
        _ => None,
    }
}

const DAY_NAMES: [&str; 7] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

/// When the learner practised in the last four weeks, and a suggestion with 8+ sittings.
pub fn history(c: &Catalog, events: &[Event], now: Timestamp, tz: &TimeZone) -> History {
    let ss = sessions(&finished(c, events), now, tz);
    let mut cells: BTreeSet<Cell> = BTreeSet::new();
    for &(d, s, e) in &ss {
        let wd = d.weekday().to_monday_zero_offset() as u8;
        for slot in slots(s, e) {
            cells.insert((wd, slot as u8));
        }
    }
    let mut out = History {
        sessions: ss.len(),
        cells: cells.into_iter().collect(),
        suggestion: None,
    };
    if ss.len() < SUGGEST_SESSIONS {
        return out;
    }
    let mut windows = Vec::new();
    let mut phrases = Vec::new();
    for (group, days) in [(0..5, "weekdays"), (5..7, "weekend")] {
        let mut weight = [0u32; 48];
        let mut per_day: BTreeMap<usize, usize> = BTreeMap::new();
        for &(d, s, e) in &ss {
            let wd = d.weekday().to_monday_zero_offset() as usize;
            if group.contains(&wd) {
                *per_day.entry(wd).or_default() += 1;
                for slot in slots(s, e) {
                    weight[slot as usize] += 1;
                }
            }
        }
        let Some((s, e)) = best_run(&weight) else {
            continue;
        };
        let used: Vec<usize> = if days == "weekdays" && per_day.len() >= 3 {
            group.collect()
        } else {
            per_day.keys().copied().collect()
        };
        windows.push(Window {
            days: used.iter().map(|&i| WEEKDAYS[i].to_string()).collect(),
            start: hhmm(s),
            end: hhmm(e),
        });
        let who = if days == "weekdays" && used.len() == 5 {
            "weekdays".to_string()
        } else if used.len() == 2 && days == "weekend" {
            "weekend".to_string()
        } else {
            used.iter()
                .map(|&i| DAY_NAMES[i])
                .collect::<Vec<_>>()
                .join(" and ")
        };
        phrases.push(match (days, part_of_day(s, e)) {
            ("weekend", Some(part)) if who != "weekend" => format!("**{who} {part}**"),
            _ => format!("**{} on {who}**", range(s, e)),
        });
    }
    if !windows.is_empty() {
        out.suggestion = Some(Suggestion {
            windows,
            sessions: ss.len(),
            text: format!(
                "You usually practise {}, from your last {} sessions.",
                phrases.join(" and "),
                ss.len()
            ),
        });
    }
    out
}

/// Median minutes of passes on problems you had passed before; `None` below 3 samples.
pub fn review_minutes(c: &Catalog, events: &[Event]) -> Option<u32> {
    let mut passed: HashSet<String> = HashSet::new();
    let mut times = Vec::new();
    for a in finished(c, events)
        .iter()
        .filter(|a| a.outcome == Outcome::Pass)
    {
        if !passed.insert(a.problem.clone()) {
            times.push(a.elapsed.as_secs());
        }
    }
    if times.len() < MIN_REVIEW_SAMPLES {
        return None;
    }
    times.sort_unstable();
    Some(((times[times.len() / 2] + 59) / 60) as u32)
}

fn plural(n: usize, one: &str) -> String {
    if n == 1 {
        format!("1 {one}")
    } else {
        format!("{n} {one}s")
    }
}

/// "Noticed this week": at most `limit` insights, the most telling first.
pub fn insights(
    c: &Catalog,
    events: &[Event],
    now: Timestamp,
    tz: &TimeZone,
    limit: usize,
) -> Vec<Insight> {
    let attempts = finished(c, events);
    let today = local_day(now, tz);
    let age = |a: &Attempt| i64::from((today - local_day(a.end.expect("finished"), tz)).get_days());
    let mut out = Vec::new();

    // 1. Hints on a technique, this week against the week before.
    let mut weeks: HashMap<(usize, usize), [(usize, usize); 2]> = HashMap::new();
    for a in &attempts {
        let Some(p) = c.problem(&a.problem) else {
            continue;
        };
        let w = match age(a) {
            0..=6 => 1,
            7..=13 => 0,
            _ => continue,
        };
        let slot = &mut weeks.entry((p.module, p.technique)).or_default()[w];
        slot.0 += 1;
        slot.1 += usize::from(a.hints > 0 || a.peeks > 0);
    }
    let best = weeks
        .iter()
        .filter(|(_, [w0, w1])| {
            w0.0 >= MIN_TREND_ATTEMPTS && w1.0 >= MIN_TREND_ATTEMPTS && w0.1 != w1.1
        })
        .max_by(|(ka, a), (kb, b)| {
            let d = |x: &[(usize, usize); 2]| {
                (x[1].1 as f64 / x[1].0 as f64 - x[0].1 as f64 / x[0].0 as f64).abs()
            };
            d(a).total_cmp(&d(b)).then(kb.cmp(ka))
        });
    if let Some((&(m, t), [w0, w1])) = best {
        let tech = skills::mid_sentence(&c.modules[m].techniques[t].title);
        let dir = if w1.1 < w0.1 { "down" } else { "up" };
        out.push(Insight {
            kind: "hints".into(),
            icon: if dir == "down" { "trending-down" } else { "trending-up" }.into(),
            text: format!(
                "Hints on {tech}: **{} of {} attempts** this week, {dir} from {} of {} the week before.",
                w1.1, w1.0, w0.1, w0.0
            ),
        });
    }

    // 2. The cleanest hour, when it beats the overall clean rate.
    let recent: Vec<&Attempt> = attempts.iter().filter(|a| age(a) < HISTORY_DAYS).collect();
    let overall = recent.iter().filter(|a| a.clean).count() as f64 / recent.len().max(1) as f64;
    let mut hours: BTreeMap<u32, (usize, usize, BTreeMap<usize, usize>)> = BTreeMap::new();
    for a in &recent {
        let z = a.start.to_zoned(tz.clone());
        let h = hours.entry(z.hour() as u32).or_default();
        h.0 += 1;
        h.1 += usize::from(a.clean);
        *h.2.entry(z.weekday().to_monday_zero_offset() as usize)
            .or_default() += 1;
    }
    if let Some((h, (n, k, days))) = hours
        .iter()
        .filter(|(_, (n, k, _))| *n >= MIN_HOUR_ATTEMPTS && (*k as f64 / *n as f64) > overall)
        .max_by(|a, b| {
            (a.1.1 as f64 / a.1.0 as f64)
                .total_cmp(&(b.1.1 as f64 / b.1.0 as f64))
                .then(b.0.cmp(a.0))
        })
    {
        let mut top: Vec<(usize, usize)> = days
            .iter()
            .map(|(d, n)| (*d, *n))
            .filter(|x| x.1 >= 2)
            .collect();
        top.sort_by_key(|x| (std::cmp::Reverse(x.1), x.0));
        top.truncate(2);
        top.sort();
        let short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        let when = match top.as_slice() {
            [] => range(h * 60, h * 60 + 60),
            xs => format!(
                "{}, {}",
                xs.iter()
                    .map(|x| short[x.0])
                    .collect::<Vec<_>>()
                    .join(" and "),
                range(h * 60, h * 60 + 60)
            ),
        };
        out.push(Insight {
            kind: "clean_hour".into(),
            icon: "clock-3".into(),
            text: format!("Your cleanest hour is **{when}**: {k} of {n} clean passes."),
        });
    }

    // 3. Review pace against the targets.
    if let Some(m) = review_minutes(c, events) {
        let mut targets: Vec<u64> = attempts
            .iter()
            .filter_map(|a| c.problem(&a.problem))
            .map(|p| p.time_target.as_secs() / 60)
            .collect();
        targets.sort_unstable();
        if let Some(&t) = targets.get(targets.len() / 2) {
            let t = t as u32;
            if f64::from(m) <= 0.6 * f64::from(t) {
                out.push(Insight {
                    kind: "review_pace".into(),
                    icon: "gauge".into(),
                    text: format!("Reviews take you **{m} min** against a {t} min target, so a session fits more of them."),
                });
            } else if f64::from(m) >= 1.2 * f64::from(t) {
                out.push(Insight {
                    kind: "review_pace".into(),
                    icon: "gauge".into(),
                    text: format!(
                        "Reviews take you **{m} min**, over the {t} min target. Sessions are sized from your time, not the target."
                    ),
                });
            }
        }
    }

    // 4. Volume this week against the week before.
    let this: usize = attempts.iter().filter(|a| age(a) <= 6).count();
    let last: usize = attempts
        .iter()
        .filter(|a| (7..=13).contains(&age(a)))
        .count();
    if this > 0 && last > 0 && this != last {
        out.push(Insight {
            kind: "volume".into(),
            icon: "calendar-check".into(),
            text: format!(
                "This week: **{}**, against {} the week before.",
                plural(this, "attempt"),
                last
            ),
        });
    }
    out.truncate(limit);
    out
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::progress::{kind, mode};
    use crate::testutil::{chicago, good_catalog};

    fn at(m: i8, d: i8, h: i8, min: i8) -> Timestamp {
        jiff::civil::date(2026, m, d)
            .at(h, min, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp()
    }

    fn solve(p: &str, id: &str, t: Timestamp, mins: i64, hint: bool) -> Vec<Event> {
        let ev = |time, k: &str, data: &[(&str, String)]| Event {
            time,
            kind: k.into(),
            problem: p.into(),
            attempt: id.into(),
            mode: mode::PRACTICE.into(),
            data: data
                .iter()
                .map(|(a, b)| (a.to_string(), b.clone()))
                .collect::<BTreeMap<_, _>>(),
        };
        let mut out = vec![ev(t, kind::OPENED, &[])];
        if hint {
            out.push(ev(
                t + SignedDuration::from_mins(1),
                kind::HINT_REVEALED,
                &[],
            ));
        }
        let end = t + SignedDuration::from_mins(mins);
        out.push(ev(
            end,
            kind::PASSED,
            &[("elapsed_ms", (mins * 60_000).to_string())],
        ));
        out
    }

    #[test]
    fn clock_and_range_read_naturally() {
        assert_eq!(clock(21 * 60), "9 pm");
        assert_eq!(clock(22 * 60 + 30), "10:30 pm");
        assert_eq!(clock(0), "12 am");
        assert_eq!(clock(12 * 60), "12 pm");
        assert_eq!(range(21 * 60, 22 * 60 + 30), "9 to 10:30 pm");
        assert_eq!(range(11 * 60, 13 * 60), "11 am to 1 pm");
    }

    #[test]
    fn eight_sittings_suggest_windows_and_paint_dots() {
        let c = good_catalog();
        let mut events = Vec::new();
        // Weeknights at 21:00 for two weeks, plus Saturday mornings.
        for (i, d) in [2, 3, 4, 5, 6, 9, 10, 11, 12, 13].into_iter().enumerate() {
            events.extend(solve(
                "p-one",
                &format!("w{i}"),
                at(11, d, 21, 0),
                20,
                false,
            ));
            events.extend(solve(
                "p-two",
                &format!("v{i}"),
                at(11, d, 21, 25),
                25,
                false,
            ));
        }
        for (i, d) in [7, 14].into_iter().enumerate() {
            events.extend(solve(
                "p-one",
                &format!("s{i}"),
                at(11, d, 10, 0),
                40,
                false,
            ));
        }
        let h = history(&c, &events, at(11, 14, 20, 0), &chicago());
        assert_eq!(h.sessions, 12);
        assert!(h.cells.contains(&(0, 42)), "Monday 21:00");
        assert!(h.cells.contains(&(5, 20)), "Saturday 10:00");
        let s = h.suggestion.expect("a suggestion with 12 sittings");
        assert_eq!(s.windows[0].days.len(), 5);
        assert_eq!(
            (s.windows[0].start.as_str(), s.windows[0].end.as_str()),
            ("21:00", "22:00")
        );
        assert_eq!(s.windows[1].days, vec!["sat".to_string()]);
        assert_eq!(
            s.text,
            "You usually practise **9 to 10 pm on weekdays** and **Saturday mornings**, from your last 12 sessions."
        );
        let few = history(&c, &events[..12], at(11, 14, 20, 0), &chicago());
        assert!(few.suggestion.is_none() && !few.cells.is_empty());
    }

    #[test]
    fn insights_name_two_facts() {
        let c = good_catalog();
        let mut events = Vec::new();
        for (i, d) in [3, 4, 5].into_iter().enumerate() {
            events.extend(solve("p-one", &format!("a{i}"), at(11, d, 21, 0), 8, true));
        }
        for (i, d) in [10, 11, 12].into_iter().enumerate() {
            events.extend(solve(
                "p-two",
                &format!("b{i}"),
                at(11, d, 21, 0),
                8,
                i == 0,
            ));
        }
        let ins = insights(&c, &events, at(11, 14, 20, 0), &chicago(), 3);
        let hints = ins.iter().find(|i| i.kind == "hints").expect("hint trend");
        assert_eq!(
            hints.text,
            "Hints on one: **1 of 3 attempts** this week, down from 3 of 3 the week before."
        );
        assert!(ins.len() <= 3);
        for i in &ins {
            assert_eq!(i.text.matches("**").count() % 2, 0, "{}", i.text);
            assert!(!i.text.contains('%'), "counts, not percentages: {}", i.text);
        }
        assert_eq!(review_minutes(&c, &events), Some(8));
    }
}
