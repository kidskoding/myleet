//! The live diagnostic that tells a new learner where to start.

use std::collections::{BTreeMap, HashSet};

use crate::catalog::{Catalog, Module, Problem};
use crate::progress::{Event, kind};
use crate::schedule::{self, Attempt};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Clean,
    Hinted,
    Failed,
    Skipped,
}

impl Outcome {
    pub fn as_str(self) -> &'static str {
        match self {
            Outcome::Clean => "clean",
            Outcome::Hinted => "hinted",
            Outcome::Failed => "failed",
            Outcome::Skipped => "skipped",
        }
    }

    /// Go keeps unknown outcome strings, which grade as start here; `Failed` grades the same.
    fn parse(s: &str) -> Outcome {
        match s {
            "clean" => Outcome::Clean,
            "hinted" => Outcome::Hinted,
            "skipped" => Outcome::Skipped,
            _ => Outcome::Failed,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Strong,
    Shaky,
    StartHere,
}

impl Level {
    pub fn as_str(self) -> &'static str {
        match self {
            Level::Strong => "strong",
            Level::Shaky => "shaky",
            Level::StartHere => "start here",
        }
    }
}

/// One topic in the diagnostic; `prefer` lists problem ids, first match wins.
#[derive(Debug, Clone, Copy)]
pub struct Slot {
    pub topic: &'static str,
    pub prefer: &'static [&'static str],
}

/// Covers the core interview families without becoming a full mock.
pub const DEFAULT_SLOTS: &[Slot] = &[
    Slot {
        topic: "arrays and hashing",
        prefer: &["two-sum", "contains-duplicate", "valid-anagram"],
    },
    Slot {
        topic: "two pointers",
        prefer: &[
            "valid-palindrome",
            "move-zeroes",
            "remove-duplicates-from-sorted-array",
        ],
    },
    Slot {
        topic: "trees",
        prefer: &[
            "invert-binary-tree",
            "maximum-depth-of-binary-tree",
            "same-tree",
        ],
    },
    Slot {
        topic: "graphs",
        prefer: &[
            "number-of-islands",
            "flood-fill",
            "find-if-path-exists-in-graph",
        ],
    },
    Slot {
        topic: "binary search",
        prefer: &[
            "binary-search",
            "search-insert-position",
            "guess-number-higher-or-lower",
        ],
    },
];

#[derive(Debug, Clone)]
pub struct Item<'a> {
    pub topic: &'static str,
    pub problem: &'a Problem,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ItemResult {
    pub topic: String,
    pub problem_id: String,
    pub module_id: String,
    pub outcome: Outcome,
    pub level: Level,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Result {
    pub skipped: bool,
    pub items: Vec<ItemResult>,
}

/// Grades one warm-up problem. Over time matches a hint: still a pass, but not
/// "strong", since interviews care about finishing under the target.
pub fn score(passed: bool, hints: u32, skipped: bool, over_time: bool) -> Outcome {
    if skipped {
        Outcome::Skipped
    } else if !passed {
        Outcome::Failed
    } else if hints > 0 || over_time {
        Outcome::Hinted
    } else {
        Outcome::Clean
    }
}

pub fn level_of(o: Outcome) -> Level {
    match o {
        Outcome::Clean => Level::Strong,
        Outcome::Hinted => Level::Shaky,
        Outcome::Failed | Outcome::Skipped => Level::StartHere,
    }
}

/// Picks one existing curriculum problem per slot.
pub fn resolve<'a>(c: &'a Catalog, slots: &[Slot]) -> Vec<Item<'a>> {
    slots
        .iter()
        .filter_map(|slot| {
            slot.prefer
                .iter()
                .filter_map(|id| c.problem(id))
                .find(|p| !c.module_of(p).bank)
                .map(|problem| Item {
                    topic: slot.topic,
                    problem,
                })
        })
        .collect()
}

/// Reports whether the learner should see the placement prompt. Opening and
/// leaving problems does not count: only a practice pass, or an already
/// finished/skipped diagnostic, suppresses it.
pub fn needs(events: &[Event], attempts: &[Attempt]) -> bool {
    !done(events)
        && !attempts
            .iter()
            .any(|a| a.outcome == schedule::Outcome::Pass)
}

/// True after a finished or skipped diagnostic.
pub fn done(events: &[Event]) -> bool {
    events.iter().any(|e| e.kind == kind::PLACEMENT_DONE)
}

/// Reconstructs the last placement result from events.
pub fn load(events: &[Event]) -> Option<Result> {
    let e = events
        .iter()
        .rev()
        .find(|e| e.kind == kind::PLACEMENT_DONE)?;
    if e.data.get("skipped").is_some_and(|v| v == "1") {
        return Some(Result {
            skipped: true,
            items: vec![],
        });
    }
    Some(Result {
        skipped: false,
        items: decode_items(e.data.get("results").map_or("", String::as_str)),
    })
}

/// Packs results for a `placement_done` event.
pub fn encode(items: &[ItemResult]) -> BTreeMap<String, String> {
    BTreeMap::from([("results".to_string(), encode_items(items))])
}

/// Module ids the learner should drill first after placement.
pub fn weak_modules(r: &Result) -> HashSet<String> {
    weak_modules_of(&r.items)
}

/// The first start-here module, else the first shaky one.
pub fn recommend<'a>(c: &'a Catalog, r: &Result) -> Option<&'a Module> {
    recommend_of(c, &r.items)
}

pub(crate) fn decode_items(raw: &str) -> Vec<ItemResult> {
    raw.split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .filter_map(|part| {
            let bits: Vec<&str> = part.split(':').collect();
            let [topic, id, outcome, module] = bits[..] else {
                return None;
            };
            let outcome = Outcome::parse(outcome);
            Some(ItemResult {
                topic: topic.into(),
                problem_id: id.into(),
                module_id: module.into(),
                outcome,
                level: level_of(outcome),
            })
        })
        .collect()
}

pub(crate) fn encode_items(items: &[ItemResult]) -> String {
    items
        .iter()
        .map(|it| {
            [
                it.topic.replace(':', " ").as_str(),
                &it.problem_id,
                it.outcome.as_str(),
                &it.module_id,
            ]
            .join(":")
        })
        .collect::<Vec<_>>()
        .join(",")
}

pub(crate) fn weak_modules_of(items: &[ItemResult]) -> HashSet<String> {
    items
        .iter()
        .filter(|it| {
            matches!(it.level, Level::StartHere | Level::Shaky) && !it.module_id.is_empty()
        })
        .map(|it| it.module_id.clone())
        .collect()
}

pub(crate) fn recommend_of<'a>(c: &'a Catalog, items: &[ItemResult]) -> Option<&'a Module> {
    let mut shaky = None;
    for it in items {
        let Some(p) = c.problem(&it.problem_id) else {
            continue;
        };
        let module = c.module_of(p);
        match it.level {
            Level::StartHere => return Some(module),
            Level::Shaky if shaky.is_none() => shaky = Some(module),
            _ => {}
        }
    }
    shaky
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::mode;
    use crate::schedule::Outcome as Run;
    use crate::testutil::{attempt, event, good_catalog};
    use jiff::Timestamp;

    fn placement_done(data: BTreeMap<String, String>) -> Event {
        event(
            Timestamp::UNIX_EPOCH,
            kind::PLACEMENT_DONE,
            mode::PLACEMENT,
            data,
        )
    }

    #[test]
    fn resolve_prefers_existing_problems() {
        let c = good_catalog();
        let items = resolve(
            &c,
            &[
                Slot {
                    topic: "arrays",
                    prefer: &["missing", "two-sum"],
                },
                Slot {
                    topic: "other",
                    prefer: &["nope"],
                },
            ],
        );
        assert_eq!(items.len(), 1, "{items:?}");
        assert_eq!(items[0].problem.id, "two-sum");
    }

    #[test]
    fn needs_and_done() {
        assert!(needs(&[], &[]), "a brand new learner needs placement");
        let skipped = [placement_done(BTreeMap::from([(
            "skipped".into(),
            "1".into(),
        )]))];
        assert!(
            !needs(&skipped, &[]) && done(&skipped),
            "skipped placement should not re-prompt"
        );
        assert!(
            needs(&[], &[attempt("", Run::Fail)]),
            "leaving without a pass should still prompt placement"
        );
        assert!(
            !needs(&[], &[attempt("", Run::Pass)]),
            "someone with a practice pass does not need placement"
        );
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
            item("trees", "invert-binary-tree", "trees", Outcome::Failed),
            item(
                "arrays and hashing",
                "two-sum",
                "arrays_and_hashing",
                Outcome::Clean,
            ),
        ];
        let got = load(&[placement_done(encode(&items))]).expect("loaded");
        assert_eq!(got.items.len(), 2, "{got:?}");
        assert_eq!(got.items[0].level, Level::StartHere);
        assert_eq!(got.items[1].level, Level::Strong);
        let weak = weak_modules(&got);
        assert!(weak.contains("trees") && !weak.contains("arrays_and_hashing"));
    }

    #[test]
    fn encode_replaces_colons_in_topics() {
        let items = [ItemResult {
            topic: "a:b".into(),
            problem_id: "two-sum".into(),
            module_id: "beta".into(),
            outcome: Outcome::Hinted,
            level: Level::Shaky,
        }];
        let got = load(&[placement_done(encode(&items))]).expect("loaded");
        assert_eq!(got.items[0].topic, "a b");
        assert_eq!(got.items[0].problem_id, "two-sum");
    }

    #[test]
    fn score_grades() {
        assert_eq!(score(true, 0, false, false), Outcome::Clean);
        assert_eq!(score(true, 1, false, false), Outcome::Hinted);
        assert_eq!(
            score(true, 0, false, true),
            Outcome::Hinted,
            "over time should score as shaky, like a hint"
        );
        assert_eq!(score(false, 0, false, false), Outcome::Failed);
        assert_eq!(score(false, 0, true, false), Outcome::Skipped);
    }

    #[test]
    fn default_slots_resolve_against_curriculum() {
        let Ok(c) = crate::catalog::load(std::path::Path::new(env!("CARGO_MANIFEST_DIR"))) else {
            return;
        };
        assert_eq!(resolve(&c, DEFAULT_SLOTS).len(), DEFAULT_SLOTS.len());
    }
}
