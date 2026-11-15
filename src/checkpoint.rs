//! The curriculum-slice exam that realigns Today afterward.

use std::collections::{BTreeMap, HashSet};

use jiff::Timestamp;

use crate::catalog::{Catalog, Module};
use crate::placement::{decode_items, encode_items, recommend_of, weak_modules_of};
use crate::progress::{Event, kind, mode};
use crate::schedule::{self, Attempt};

pub use crate::placement::{ItemResult, Level, Outcome, level_of};

const MIXED_MODULE: &str = "mixed_interview_practice";
/// Practice passes between recommended check-ins, mid-module or across modules.
const CHECK_IN_EVERY: usize = 3;

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Result {
    /// Module number ceiling.
    pub through: u64,
    pub items: Vec<ItemResult>,
}

pub fn score(passed: bool, hints: u32, skipped: bool) -> Outcome {
    crate::placement::score(passed, hints, skipped, false)
}

/// Non-bank curriculum modules that can be a checkpoint "through" point.
pub fn ceiling_modules(c: &Catalog) -> Vec<&Module> {
    c.modules
        .iter()
        .filter(|m| !m.bank && m.id != MIXED_MODULE)
        .collect()
}

/// The furthest module with a practice pass, else the first ceiling module's number.
pub fn default_through(c: &Catalog, attempts: &[Attempt]) -> u64 {
    let ceilings = ceiling_modules(c);
    let Some(first) = ceilings.first() else {
        return 0;
    };
    let passed: HashSet<&str> = attempts
        .iter()
        .filter(|a| a.outcome == schedule::Outcome::Pass && a.mode == mode::PRACTICE)
        .map(|a| a.problem.as_str())
        .collect();
    ceilings
        .iter()
        .filter(|m| {
            m.techniques
                .iter()
                .flat_map(|t| &t.problems)
                .any(|&i| passed.contains(c.problems()[i].id.as_str()))
        })
        .map(|m| m.number)
        .fold(first.number, u64::max)
}

/// Reconstructs the latest checkpoint result from events.
pub fn load(events: &[Event]) -> Option<Result> {
    let e = events
        .iter()
        .rev()
        .find(|e| e.kind == kind::CHECKPOINT_DONE)?;
    let get = |k: &str| e.data.get(k).map_or("", String::as_str);
    Some(Result {
        through: get("through").parse().unwrap_or(0),
        items: decode_items(get("results")),
    })
}

/// Packs results for a `checkpoint_done` event.
pub fn encode(through: u64, items: &[ItemResult]) -> BTreeMap<String, String> {
    BTreeMap::from([
        ("through".to_string(), through.to_string()),
        ("results".to_string(), encode_items(items)),
    ])
}

/// Module ids the learner should drill first after a checkpoint.
pub fn weak_modules(r: &Result) -> HashSet<String> {
    weak_modules_of(&r.items)
}

/// The first start-here module, else the first shaky one.
pub fn recommend<'a>(c: &'a Catalog, r: &Result) -> Option<&'a Module> {
    recommend_of(c, &r.items)
}

/// Picks a check-in ceiling when you've done enough practice since the last
/// checkpoint (or snooze); 0 means not yet. The ceiling is your current frontier:
/// mid-module is fine; spanning several modules is fine. Not an end-of-chapter gate.
pub fn suggest_through(c: &Catalog, events: &[Event], attempts: &[Attempt]) -> u64 {
    if passes_since(attempts, last_checkpoint_at(events)) < CHECK_IN_EVERY {
        return 0;
    }
    default_through(c, attempts)
}

fn last_checkpoint_at(events: &[Event]) -> Option<Timestamp> {
    events
        .iter()
        .filter(|e| e.kind == kind::CHECKPOINT_DONE)
        .map(|e| e.time)
        .max()
}

fn passes_since(attempts: &[Attempt], since: Option<Timestamp>) -> usize {
    attempts
        .iter()
        .filter(|a| a.outcome == schedule::Outcome::Pass && a.mode == mode::PRACTICE)
        .filter(|a| since.is_none_or(|s| a.end.unwrap_or(a.start) > s))
        .count()
}

/// Packs a "not now" so Today stops recommending this ceiling for a while.
pub fn snooze(through: u64) -> BTreeMap<String, String> {
    BTreeMap::from([
        ("through".to_string(), through.to_string()),
        ("snoozed".to_string(), "1".to_string()),
    ])
}

/// The title of the ceiling module with the given number.
pub fn module_title(c: &Catalog, through: u64) -> Option<&str> {
    ceiling_modules(c)
        .into_iter()
        .find(|m| m.number == through)
        .map(|m| m.title.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::{attempt, day, event, good_catalog};

    fn done_at(t: Timestamp, data: BTreeMap<String, String>) -> Event {
        event(t, kind::CHECKPOINT_DONE, mode::CHECKPOINT, data)
    }

    fn pass_at(id: &str, at: Timestamp) -> Attempt {
        Attempt {
            mode: mode::PRACTICE.into(),
            start: at,
            end: Some(at),
            ..attempt(id, schedule::Outcome::Pass)
        }
    }

    #[test]
    fn encode_load_round_trip() {
        let item = |topic: &str, id: &str, module: &str, outcome| ItemResult {
            topic: topic.into(),
            problem_id: id.into(),
            module_id: module.into(),
            outcome,
            level: level_of(outcome),
        };
        let items = [
            item("Alpha", "p-one", "alpha", Outcome::Failed),
            item("Beta", "two-sum", "beta", Outcome::Clean),
        ];
        let got = load(&[done_at(Timestamp::UNIX_EPOCH, encode(1, &items))]).expect("loaded");
        assert_eq!((got.through, got.items.len()), (1, 2), "{got:?}");
        let weak = weak_modules(&got);
        assert!(weak.contains("alpha") && !weak.contains("beta"), "{weak:?}");
    }

    #[test]
    fn default_through_follows_passes() {
        let c = good_catalog();
        assert_eq!(default_through(&c, &[]), 1);
        let atts = [Attempt {
            mode: mode::PRACTICE.into(),
            ..attempt("two-sum", schedule::Outcome::Pass)
        }];
        assert_eq!(default_through(&c, &atts), 2, "pass in beta");
    }

    #[test]
    fn suggest_through_by_practice_cadence() {
        let c = good_catalog();
        let early = [pass_at("p-one", day(17)), pass_at("p-two", day(18))];
        assert_eq!(suggest_through(&c, &[], &early), 0, "too early");

        let mid = vec![
            pass_at("p-one", day(16)),
            pass_at("p-two", day(17)),
            pass_at("p-three", day(18)),
        ];
        assert_eq!(
            suggest_through(&c, &[], &mid),
            1,
            "mid-module should recommend frontier"
        );

        let mut across = mid;
        across.push(pass_at("two-sum", day(19)));
        assert_eq!(
            suggest_through(&c, &[], &across),
            2,
            "multi-module frontier"
        );
    }

    #[test]
    fn suggest_through_resets_after_checkpoint_or_snooze() {
        let c = good_catalog();
        let mut atts = vec![
            pass_at("p-one", day(10)),
            pass_at("p-two", day(11)),
            pass_at("p-three", day(12)),
        ];
        let mut events = vec![done_at(day(13), encode(1, &[]))];
        assert_eq!(
            suggest_through(&c, &events, &atts),
            0,
            "passes before checkpoint should not count"
        );
        atts.extend([
            pass_at("p-one", day(14)),
            pass_at("p-two", day(15)),
            pass_at("two-sum", day(16)),
        ]);
        assert_eq!(
            suggest_through(&c, &events, &atts),
            2,
            "after more practice, recommend again"
        );
        events.push(done_at(day(17), snooze(2)));
        assert_eq!(
            suggest_through(&c, &events, &atts),
            0,
            "snooze resets cadence"
        );
    }

    #[test]
    fn score_grades() {
        assert_eq!(score(true, 0, false), Outcome::Clean);
        assert_eq!(score(true, 1, false), Outcome::Hinted);
        assert_eq!(score(false, 0, false), Outcome::Failed);
        assert_eq!(score(false, 0, true), Outcome::Skipped);
    }

    #[test]
    fn module_title_and_recommend() {
        let c = good_catalog();
        assert_eq!(module_title(&c, 2), Some("Beta"));
        assert_eq!(module_title(&c, 99), None);
        let r = Result {
            through: 2,
            items: vec![ItemResult {
                topic: "Beta".into(),
                problem_id: "two-sum".into(),
                module_id: "beta".into(),
                outcome: Outcome::Hinted,
                level: Level::Shaky,
            }],
        };
        assert_eq!(recommend(&c, &r).map(|m| m.id.as_str()), Some("beta"));
    }
}
