use std::collections::{BTreeMap, BTreeSet, HashMap};

use jiff::civil::Date;
use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};

use crate::catalog::{Catalog, Difficulty, Module, Technique};
use crate::schedule::{Attempt, Outcome, State, Status, local_day};

const MIN_ATTEMPTS_FOR_WEAKNESS: u32 = 3;
const MAX_WEAKEST: usize = 5;
/// One missed day per this many days is a rest day: it keeps the streak but doesn't add to it.
const REST_EVERY_DAYS: i32 = 7;

#[derive(Debug)]
pub struct TechniqueScore<'a> {
    pub module: &'a Module,
    pub technique: &'a Technique,
    pub fail_rate: f64,
    pub hint_rate: f64,
    pub attempts: u32,
}

#[derive(Debug, Default)]
pub struct Summary<'a> {
    pub counts: HashMap<Status, usize>,
    /// Mastered and total, curriculum only.
    pub mastery: [usize; 2],
    /// Practice days in a row (any finished attempt counts), allowing one rest day a week.
    pub streak: usize,
    /// The rest days inside the current streak, newest first.
    pub rest_days: Vec<Date>,
    /// The latest local day with a finished attempt.
    pub last_practiced: Option<Date>,
    /// Passes per local day.
    pub heatmap: BTreeMap<Date, usize>,
    pub weakest: Vec<TechniqueScore<'a>>,
    pub median_by_diff: HashMap<Difficulty, SignedDuration>,
}

#[derive(Default)]
struct Tally {
    attempts: u32,
    fails: u32,
    hinted: u32,
}

pub fn compute<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    attempts: &[Attempt],
    now: Timestamp,
    tz: &TimeZone,
) -> Summary<'a> {
    let mut s = Summary::default();
    for p in c.problems() {
        let status = states.get(&p.id).map_or(Status::Unseen, |st| st.status);
        let bank = c.module_of(p).bank;
        if bank && status == Status::Unseen {
            continue;
        }
        if !bank {
            s.mastery[1] += 1;
            if status == Status::Mastered {
                s.mastery[0] += 1;
            }
        }
        *s.counts.entry(status).or_default() += 1;
    }

    // Keyed by (module, technique) index so the weakest order is stable on ties.
    let mut by_tech: BTreeMap<(usize, usize), Tally> = BTreeMap::new();
    let mut times: HashMap<Difficulty, Vec<SignedDuration>> = HashMap::new();
    for a in attempts {
        let Some(p) = c.problem(&a.problem) else {
            continue;
        };
        if a.outcome == Outcome::None {
            continue;
        }
        let t = by_tech.entry((p.module, p.technique)).or_default();
        t.attempts += 1;
        if a.outcome == Outcome::Fail {
            t.fails += 1;
        }
        if a.hints > 0 {
            t.hinted += 1;
        }
        if a.outcome == Outcome::Pass {
            if let Some(end) = a.end {
                *s.heatmap.entry(local_day(end, tz)).or_default() += 1;
            }
            times.entry(p.difficulty).or_default().push(a.elapsed);
        }
    }

    let practiced: BTreeSet<Date> = attempts
        .iter()
        .filter(|a| a.outcome != Outcome::None && c.problem(&a.problem).is_some())
        .filter_map(|a| a.end.map(|end| local_day(end, tz)))
        .collect();
    (s.streak, s.rest_days) = streak(&practiced, local_day(now, tz));
    s.last_practiced = practiced.last().copied();

    for ((m, t), tally) in by_tech {
        if tally.attempts < MIN_ATTEMPTS_FOR_WEAKNESS || tally.fails + tally.hinted == 0 {
            continue;
        }
        let module = &c.modules[m];
        s.weakest.push(TechniqueScore {
            module,
            technique: &module.techniques[t],
            attempts: tally.attempts,
            fail_rate: f64::from(tally.fails) / f64::from(tally.attempts),
            hint_rate: f64::from(tally.hinted) / f64::from(tally.attempts),
        });
    }
    s.weakest.sort_by(|a, b| {
        (b.fail_rate + b.hint_rate)
            .total_cmp(&(a.fail_rate + a.hint_rate))
            .then(b.attempts.cmp(&a.attempts))
    });
    s.weakest.truncate(MAX_WEAKEST);

    for (diff, mut ds) in times {
        ds.sort();
        s.median_by_diff.insert(diff, ds[ds.len() / 2]);
    }
    s
}

/// Practice days in a row ending today or yesterday. A missed day is forgiven as a rest day
/// when the day before it was practiced and no other rest day falls within a week of it.
fn streak(practiced: &BTreeSet<Date>, today: Date) -> (usize, Vec<Date>) {
    let mut day = today;
    if !practiced.contains(&day) {
        day = day.yesterday().unwrap_or(day);
    }
    let (mut n, mut rests) = (0, Vec::<Date>::new());
    loop {
        let Ok(prev) = day.yesterday() else { break };
        if practiced.contains(&day) {
            n += 1;
        } else {
            let spaced = rests
                .last()
                .is_none_or(|&r| (r - day).get_days() >= REST_EVERY_DAYS);
            if !(spaced && practiced.contains(&prev)) {
                break;
            }
            rests.push(day);
        }
        day = prev;
    }
    (n, rests)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::{attempt, chicago, day, good_catalog};

    fn pass_on(id: &str, d: i8, elapsed: SignedDuration) -> Attempt {
        Attempt {
            end: Some(day(d)),
            elapsed,
            ..attempt(id, Outcome::Pass)
        }
    }

    fn mins(m: i64) -> SignedDuration {
        SignedDuration::from_mins(m)
    }

    fn none() -> HashMap<String, State> {
        HashMap::new()
    }

    fn states(list: &[(&str, Status)]) -> HashMap<String, State> {
        list.iter()
            .map(|(id, status)| {
                let st = State {
                    status: *status,
                    ..State::default()
                };
                (id.to_string(), st)
            })
            .collect()
    }

    #[test]
    fn streak() {
        let c = good_catalog();
        let atts = [
            pass_on("p-one", 19, mins(1)),
            pass_on("p-two", 18, mins(1)),
            pass_on("p-one", 16, mins(1)),
        ];
        let tz = chicago();
        let at = |d| {
            let s = compute(&c, &none(), &atts, day(d), &tz);
            (s.streak, s.rest_days.len())
        };
        assert_eq!(
            at(19),
            (3, 1),
            "the 17th is a rest day between practice days"
        );
        assert_eq!(at(20), (3, 1), "streak ending yesterday");
        assert_eq!(
            at(21),
            (2, 1),
            "yesterday is the rest day; the 17th is too close to be another"
        );
        assert_eq!(at(22), (0, 0), "two missed days in a row break it");

        // A rest day a week apart from the last one is forgiven again.
        let days: Vec<Attempt> = (1..=20)
            .filter(|d| ![5, 13].contains(d))
            .map(|d| pass_on("p-one", d, mins(1)))
            .collect();
        let s = compute(&c, &none(), &days, day(20), &tz);
        assert_eq!((s.streak, s.rest_days.len()), (18, 2));
        let close: Vec<Attempt> = (1..=20)
            .filter(|d| ![9, 13].contains(d))
            .map(|d| pass_on("p-one", d, mins(1)))
            .collect();
        assert_eq!(
            compute(&c, &none(), &close, day(20), &tz).streak,
            10,
            "rest days 4 apart: the older one breaks it"
        );
    }

    #[test]
    fn summary_counts_heatmap_median() {
        let c = good_catalog();
        let st = states(&[("p-one", Status::Mastered), ("p-two", Status::Learning)]);
        let atts = [
            pass_on("p-one", 19, mins(10)),
            pass_on("two-sum", 19, mins(4)),
            pass_on("two-sum", 18, mins(6)),
        ];
        let s = compute(&c, &st, &atts, day(19), &chicago());
        assert_eq!(s.counts[&Status::Mastered], 1);
        assert_eq!(s.counts[&Status::Learning], 1);
        assert_eq!(s.counts[&Status::Unseen], 2);
        assert_eq!(s.heatmap[&jiff::civil::date(2026, 10, 19)], 2);
        assert_eq!(s.heatmap[&jiff::civil::date(2026, 10, 18)], 1);
        assert_eq!(s.median_by_diff[&Difficulty::Easy], mins(6));
    }

    #[test]
    fn weakest_needs_three_attempts() {
        let c = good_catalog();
        let fail = Attempt {
            end: Some(day(19)),
            ..attempt("p-one", Outcome::Fail)
        };
        let hinted = Attempt {
            end: Some(day(19)),
            hints: 1,
            ..attempt("p-two", Outcome::Pass)
        };
        let atts = [fail.clone(), fail, hinted, pass_on("p-three", 19, mins(1))];
        let s = compute(&c, &none(), &atts, day(19), &chicago());
        assert_eq!(s.weakest.len(), 1, "{:?}", s.weakest);
        let w = &s.weakest[0];
        assert_eq!((w.technique.id.as_str(), w.attempts), ("one", 3));
        assert!(w.fail_rate >= 0.66 && w.hint_rate >= 0.33, "{w:?}");
    }

    #[test]
    fn stats_ignores_unknown_ids() {
        let c = good_catalog();
        let atts = [pass_on("deleted", 19, mins(1))];
        let st = states(&[("deleted", Status::Mastered)]);
        let s = compute(&c, &st, &atts, day(19), &chicago());
        assert_eq!(s.counts.get(&Status::Mastered), None);
        assert_eq!(s.streak, 0);
    }

    #[test]
    fn weakest_skips_clean_techniques() {
        let c = good_catalog();
        let atts = [
            pass_on("two-sum", 17, mins(1)),
            pass_on("two-sum", 18, mins(1)),
            pass_on("two-sum", 19, mins(1)),
        ];
        let s = compute(&c, &none(), &atts, day(19), &chicago());
        assert!(
            s.weakest.is_empty(),
            "a technique with no fails or hints is not weak"
        );
    }

    #[test]
    fn counts_skip_unseen_bank_problems() {
        let c = good_catalog();
        let s = compute(&c, &none(), &[], day(19), &chicago());
        assert_eq!(
            s.counts[&Status::Unseen],
            4,
            "the bank's untouched problems are not counted"
        );
        let st = states(&[("logger-rate-limiter", Status::Learning)]);
        let s = compute(&c, &st, &[], day(19), &chicago());
        assert_eq!(
            s.counts[&Status::Learning],
            1,
            "a started bank problem counts"
        );
    }
}
