//! The opt-in LeetCode import: public profile counts turn into per-module priors, and
//! recent accepted problems we also teach enter the review ladder as started, never as
//! clean passes. Everything lives in the event log, so sync and export carry it.

use std::collections::{BTreeMap, HashMap, HashSet};

use jiff::Timestamp;
use jiff::tz::TimeZone;
use serde::Deserialize;

use crate::catalog::{Catalog, slug_of};
use crate::progress::{Event, kind, mode};
use crate::schedule::{Attempt, Outcome, State, local_day};

/// What the planner shows as the source of a LeetCode-flagged module.
pub const SOURCE: &str = "LeetCode history";
/// Under this many total solves there is not enough history to call anything weak.
const MIN_TOTAL: u32 = 20;
/// At most this many solves in a module and it counts as untouched.
const FEW: u32 = 3;
/// At least this many and the module starts further along.
pub const MANY: u32 = 25;
/// Recent accepted problems become review markers; more would flood the first day.
const MAX_MARKERS: usize = 10;

#[derive(Debug, Deserialize)]
pub struct Profile {
    pub username: String,
    pub solved: Solved,
    #[serde(default)]
    pub tags: Vec<TagCount>,
    #[serde(default)]
    pub recent: Vec<Recent>,
}

#[derive(Debug, Deserialize)]
pub struct Solved {
    pub all: u32,
    #[serde(default)]
    pub easy: u32,
    #[serde(default)]
    pub medium: u32,
    #[serde(default)]
    pub hard: u32,
}

#[derive(Debug, Deserialize)]
pub struct TagCount {
    pub name: String,
    pub solved: u32,
}

#[derive(Debug, Deserialize)]
pub struct Recent {
    pub slug: String,
    pub timestamp: i64,
}

/// The module a LeetCode tag counts toward; `None` for tags we do not teach by name.
pub fn module_of_tag(tag: &str) -> Option<&'static str> {
    Some(match tag {
        "Array" | "Hash Table" | "String" | "Prefix Sum" | "Matrix" | "Counting" | "Sorting" => {
            "arrays_and_hashing"
        }
        "Two Pointers" => "two_pointers",
        "Stack" | "Queue" | "Monotonic Stack" | "Monotonic Queue" => "stacks_and_queues",
        "Sliding Window" => "sliding_window",
        "Binary Search" => "binary_search",
        "Linked List" => "linked_lists",
        "Tree" | "Binary Tree" | "Binary Search Tree" => "trees",
        "Heap (Priority Queue)" | "Two Heaps" => "heaps",
        "Backtracking" => "backtracking",
        "Graph" | "Breadth-First Search" | "Depth-First Search" | "Topological Sort" => "graphs",
        "Dynamic Programming" | "Memoization" => "dp",
        "Greedy" => "greedy_algorithms",
        "Line Sweep" => "intervals",
        "Trie" => "tries",
        "Bit Manipulation" | "Bitmask" => "bit_manipulation",
        "Math" | "Geometry" | "Number Theory" | "Combinatorics" => "math_geometry",
        "Union Find"
        | "Shortest Path"
        | "Minimum Spanning Tree"
        | "Segment Tree"
        | "Binary Indexed Tree" => "advanced",
        _ => return None,
    })
}

/// What an import recorded: total solves and solves per module id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Import {
    pub username: String,
    pub total: u32,
    pub modules: BTreeMap<String, u32>,
}

impl Import {
    fn count(&self, module: &str) -> u32 {
        self.modules.get(module).copied().unwrap_or(0)
    }

    /// Modules the learner has barely touched on LeetCode, once they have real history.
    pub fn weak_modules(&self) -> HashSet<String> {
        if self.total < MIN_TOTAL {
            return HashSet::new();
        }
        self.modules
            .iter()
            .filter(|(_, n)| **n <= FEW)
            .map(|(m, _)| m.clone())
            .collect()
    }

    pub fn strong(&self, module: &str) -> bool {
        self.count(module) >= MANY
    }
}

/// Index of the first event after the latest disconnect: older import events are void.
fn cut(events: &[Event]) -> usize {
    events
        .iter()
        .rposition(|e| e.kind == kind::LEETCODE_DISCONNECTED)
        .map_or(0, |i| i + 1)
}

pub fn load(events: &[Event]) -> Option<Import> {
    let e = events[cut(events)..]
        .iter()
        .rev()
        .find(|e| e.kind == kind::LEETCODE_IMPORTED)?;
    let modules = e
        .data
        .get("modules")?
        .split(',')
        .filter_map(|p| {
            let (m, n) = p.split_once(':')?;
            Some((m.to_string(), n.parse().ok()?))
        })
        .collect();
    Some(Import {
        username: e.data.get("username").cloned().unwrap_or_default(),
        total: e
            .data
            .get("total")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
        modules,
    })
}

/// The accepted problems standing in as first attempts: finished, never clean.
pub fn solved_attempts(events: &[Event]) -> Vec<Attempt> {
    events[cut(events)..]
        .iter()
        .filter(|e| e.kind == kind::LEETCODE_SOLVED)
        .map(|e| {
            // The event is stamped with the import time so merged logs keep it after its
            // import; the day it was actually solved rides in the data.
            let at = e
                .data
                .get("solved_at")
                .and_then(|v| v.parse::<i64>().ok())
                .and_then(|s| Timestamp::from_second(s).ok())
                .unwrap_or(e.time);
            Attempt {
                id: e.attempt.clone(),
                problem: e.problem.clone(),
                start: at,
                end: Some(at),
                outcome: Outcome::Pass,
                clean: false,
                elapsed: jiff::SignedDuration::ZERO,
                hints: 0,
                peeks: 0,
                restarts: 0,
                mode: mode::LEETCODE.into(),
            }
        })
        .collect()
}

/// Days since each imported problem was solved on LeetCode, for problems whose only
/// attempt so far is that import.
pub fn solved_days(
    events: &[Event],
    states: &HashMap<String, State>,
    today: jiff::civil::Date,
    tz: &TimeZone,
) -> HashMap<String, i64> {
    solved_attempts(events)
        .into_iter()
        .filter(|a| states.get(&a.problem).is_some_and(|s| s.attempts == 1))
        .filter_map(|a| {
            let day = local_day(a.end?, tz);
            Some((a.problem, (today - day).get_days().into()))
        })
        .collect()
}

fn event(t: Timestamp, kind: &str, problem: &str, data: BTreeMap<String, String>) -> Event {
    Event {
        time: t,
        kind: kind.into(),
        problem: problem.into(),
        attempt: if problem.is_empty() {
            String::new()
        } else {
            format!("lc-{problem}")
        },
        mode: mode::LEETCODE.into(),
        data,
    }
}

pub fn disconnect_event(now: Timestamp) -> Event {
    event(now, kind::LEETCODE_DISCONNECTED, "", BTreeMap::new())
}

/// The import event, then one solved event per recent accepted problem that we teach and
/// the learner has not touched yet.
pub fn import_events(
    c: &Catalog,
    states: &HashMap<String, State>,
    p: &Profile,
    now: Timestamp,
) -> Vec<Event> {
    let mut modules: BTreeMap<String, u32> = c
        .modules
        .iter()
        .filter(|m| !m.bank)
        .map(|m| (m.id.clone(), 0))
        .collect();
    for t in &p.tags {
        if let Some(n) = module_of_tag(&t.name).and_then(|m| modules.get_mut(m)) {
            *n += t.solved;
        }
    }
    let list: Vec<String> = modules.iter().map(|(m, n)| format!("{m}:{n}")).collect();
    let data = BTreeMap::from([
        ("username".to_string(), p.username.clone()),
        ("total".to_string(), p.solved.all.to_string()),
        ("modules".to_string(), list.join(",")),
    ]);
    let mut out = vec![event(now, kind::LEETCODE_IMPORTED, "", data)];
    let by_slug: HashMap<String, &str> = c
        .problems()
        .iter()
        .map(|q| (slug_of(&q.url), q.id.as_str()))
        .collect();
    let mut seen = HashSet::new();
    for r in &p.recent {
        let Some(&id) = by_slug.get(&r.slug) else {
            continue;
        };
        if states
            .get(id)
            .is_some_and(|s| s.rung >= 0 || s.attempts > 0)
            || !seen.insert(id)
        {
            continue;
        }
        let Ok(t) = Timestamp::from_second(r.timestamp.min(now.as_second())) else {
            continue;
        };
        let at = BTreeMap::from([("solved_at".to_string(), t.as_second().to_string())]);
        out.push(event(now, kind::LEETCODE_SOLVED, id, at));
        if seen.len() == MAX_MARKERS {
            break;
        }
    }
    out
}

fn cap(s: &str) -> String {
    let mut cs = s.chars();
    cs.next()
        .map_or(String::new(), |c| c.to_uppercase().chain(cs).collect())
}

fn list_of(titles: &[String]) -> String {
    match titles {
        [] => String::new(),
        [a] => a.clone(),
        [a, b] => format!("{a} and {b}"),
        [rest @ .., last] => format!("{} and {last}", rest.join(", ")),
    }
}

/// The one-time line after connecting. Reads like a coach, never ends on a period.
pub fn summary(c: &Catalog, i: &Import, marked: usize) -> String {
    let title = |id: &str| {
        c.modules
            .iter()
            .find(|m| m.id == id)
            .map_or(id.to_string(), |m| crate::skills::mid_sentence(&m.title))
    };
    let mut ranked: Vec<(&String, u32)> = i
        .modules
        .iter()
        .filter(|(m, _)| m.as_str() != "mixed_interview_practice")
        .map(|(m, n)| (m, *n))
        .collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    if i.total == 0 {
        return "Your LeetCode profile is empty so far, so we'll start from the first topic and build up".into();
    }
    let noun = if i.total == 1 { "problem" } else { "problems" };
    let top: Vec<String> = ranked
        .iter()
        .take(2)
        .filter(|(_, n)| *n > 0)
        .map(|(m, _)| title(m))
        .collect();
    let mut s = format!("You've solved {} {noun} on LeetCode", i.total);
    if !top.is_empty() {
        s += &format!(", mostly {}", list_of(&top));
    }
    if let Some((m, n)) = ranked
        .iter()
        .rev()
        .find(|(_, n)| *n <= FEW)
        .filter(|_| i.total >= MIN_TOTAL)
    {
        let only = if *n == 0 {
            "haven't done any there".to_string()
        } else {
            format!("only done {n} there")
        };
        s += &format!(
            ". {} {} where we'll start, since you've {only}",
            cap(&title(m)),
            if title(m).ends_with('s') { "are" } else { "is" }
        );
    }
    if marked > 0 {
        let p = if marked == 1 { "problem" } else { "problems" };
        s += &format!(". {marked} recent {p} from there will come back as reviews");
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::good_catalog;

    fn profile(json: &str) -> Profile {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn tags_map_to_modules() {
        assert_eq!(module_of_tag("Dynamic Programming"), Some("dp"));
        assert_eq!(module_of_tag("Breadth-First Search"), Some("graphs"));
        assert_eq!(module_of_tag("Heap (Priority Queue)"), Some("heaps"));
        assert_eq!(module_of_tag("Database"), None);
    }

    #[test]
    fn weak_needs_real_history() {
        let mk = |total| Import {
            username: "u".into(),
            total,
            modules: BTreeMap::from([("dp".into(), 1), ("trees".into(), 40)]),
        };
        assert!(mk(5).weak_modules().is_empty());
        assert_eq!(mk(300).weak_modules(), HashSet::from(["dp".to_string()]));
        assert!(mk(300).strong("trees") && !mk(300).strong("dp"));
    }

    #[test]
    fn import_round_trips_and_disconnect_voids_it() {
        let c = good_catalog();
        let p = profile(
            r#"{"username":"kid","solved":{"all":300,"easy":100,"medium":150,"hard":50},
                "tags":[{"name":"Array","solved":120},{"name":"Hash Table","solved":80},{"name":"Nope","solved":9}],
                "recent":[{"slug":"two-sum","timestamp":1700000000},{"slug":"unknown","timestamp":1}]}"#,
        );
        let now = Timestamp::from_second(1_800_000_000).unwrap();
        let evs = import_events(&c, &HashMap::new(), &p, now);
        let got = load(&evs).unwrap();
        assert_eq!((got.username.as_str(), got.total), ("kid", 300));
        assert_eq!(
            got.modules.values().sum::<u32>(),
            if c.modules.iter().any(|m| m.id == "arrays_and_hashing") {
                200
            } else {
                0
            }
        );
        let solved: Vec<_> = evs
            .iter()
            .filter(|e| e.kind == kind::LEETCODE_SOLVED)
            .collect();
        assert!(solved.len() <= 1);
        let mut all = evs.clone();
        all.push(disconnect_event(now));
        assert!(load(&all).is_none() && solved_attempts(&all).is_empty());
    }

    #[test]
    fn summary_names_strengths_and_the_start() {
        let c = good_catalog();
        let ids: Vec<String> = c
            .modules
            .iter()
            .filter(|m| !m.bank)
            .map(|m| m.id.clone())
            .collect();
        let i = Import {
            username: "u".into(),
            total: 312,
            modules: BTreeMap::from([(ids[0].clone(), 200), (ids[1].clone(), 2)]),
        };
        let s = summary(&c, &i, 2);
        assert!(
            s.starts_with("You've solved 312 problems on LeetCode, mostly "),
            "{s}"
        );
        assert!(
            s.contains("only done 2 there") && s.contains("2 recent problems"),
            "{s}"
        );
        assert!(!s.ends_with('.'));
    }

    #[test]
    fn imported_solves_start_the_ladder_but_never_reset_it() {
        use crate::schedule;
        let c = good_catalog();
        let tz = crate::testutil::chicago();
        let t = |_: &str| jiff::SignedDuration::from_mins(30);
        let day = crate::testutil::day(1);
        let solve = event(day, kind::LEETCODE_SOLVED, "two-sum", BTreeMap::new());
        let st = &schedule::compute(std::slice::from_ref(&solve), t, &tz)["two-sum"];
        assert_eq!((st.rung, st.clean_passes, st.attempts), (0, 0, 1));
        let _ = &c;
        let gone = [solve, disconnect_event(crate::testutil::day(2))];
        assert!(!schedule::compute(&gone, t, &tz).contains_key("two-sum"));
    }
}
