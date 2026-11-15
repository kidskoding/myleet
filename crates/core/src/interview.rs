use std::collections::{HashMap, HashSet};

use jiff::{SignedDuration, Timestamp};

use crate::catalog::{Catalog, Difficulty, Module, Problem};
use crate::schedule::{Attempt, Outcome, State, Status};

pub const ROUND_LENGTH: SignedDuration = SignedDuration::from_secs(45 * 60);
pub const HINT_PENALTY: SignedDuration = SignedDuration::from_secs(3 * 60);
const FAIL_WINDOW: SignedDuration = SignedDuration::from_hours(14 * 24);
const MIXED_MODULE: &str = "mixed_interview_practice";

/// Seeded splitmix64 so one seed reproduces its picks; nothing stored depends on the sequence.
#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Rng {
        Rng(seed)
    }

    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// Uniform in [0, 1).
    pub fn float64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn weight(c: &Catalog, p: &Problem, st: Option<&State>, recent_fail: bool) -> f64 {
    let mut w = match st {
        Some(st) if st.status != Status::Unseen => {
            [3.0, 2.0, 1.0, 0.5, 0.5][st.rung.clamp(0, 4) as usize]
        }
        _ => 2.0,
    };
    if recent_fail {
        w *= 2.0;
    }
    if c.module_of(p).id == MIXED_MODULE {
        w *= 2.0;
    }
    w
}

pub fn pick<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    attempts: &[Attempt],
    n: usize,
    now: Timestamp,
    rng: &mut Rng,
) -> Vec<&'a Problem> {
    let recent: HashSet<&str> = attempts
        .iter()
        .filter(|a| {
            a.outcome == Outcome::Fail
                && a.end
                    .is_some_and(|end| now.duration_since(end) <= FAIL_WINDOW)
        })
        .map(|a| a.problem.as_str())
        .collect();
    let problems: Vec<&Problem> = c.curriculum().collect();
    let weights: Vec<f64> = problems
        .iter()
        .map(|p| weight(c, p, states.get(&p.id), recent.contains(p.id.as_str())))
        .collect();
    let mut taken = vec![false; problems.len()];
    let mut used_tech = HashSet::new();
    let mut out = Vec::new();
    while out.len() < n {
        let Some(i) = sample(
            &weights,
            |i| !taken[i] && !used_tech.contains(&(problems[i].module, problems[i].technique)),
            rng,
        )
        .or_else(|| sample(&weights, |i| !taken[i], rng)) else {
            break;
        };
        taken[i] = true;
        used_tech.insert((problems[i].module, problems[i].technique));
        out.push(problems[i]);
    }
    out
}

fn sample(weights: &[f64], ok: impl Fn(usize) -> bool, rng: &mut Rng) -> Option<usize> {
    let total: f64 = (0..weights.len())
        .filter(|&i| ok(i))
        .map(|i| weights[i])
        .sum();
    if total == 0.0 {
        return None;
    }
    let mut r = rng.float64() * total;
    let mut last = None;
    for (i, &w) in weights.iter().enumerate() {
        if !ok(i) {
            continue;
        }
        last = Some(i);
        if r < w {
            return Some(i);
        }
        r -= w;
    }
    last
}

fn checkpoint_weight(p: &Problem, st: Option<&State>) -> f64 {
    let w = match p.difficulty {
        Difficulty::Easy => 3.0,
        Difficulty::Medium => 2.0,
        Difficulty::Hard => 1.0,
    };
    if st.is_none_or(|st| st.status == Status::Unseen) {
        w * 1.5
    } else {
        w
    }
}

fn in_slice(m: &Module, through: u64) -> bool {
    !m.bank && m.id != MIXED_MODULE && m.number <= through
}

/// Samples a broad-coverage exam through module number `through`. Prefers one
/// problem per module in the slice, then fills by technique diversity. Soft
/// preference for unseen/easy so the exam is fair.
pub fn pick_checkpoint<'a>(
    c: &'a Catalog,
    states: &HashMap<String, State>,
    through: u64,
    n: usize,
    rng: &mut Rng,
) -> Vec<&'a Problem> {
    if through == 0 || n == 0 {
        return vec![];
    }
    let pool: Vec<&Problem> = c
        .curriculum()
        .filter(|p| in_slice(c.module_of(p), through))
        .collect();
    let n = n.min(pool.len());
    let weights: Vec<f64> = pool
        .iter()
        .map(|p| checkpoint_weight(p, states.get(&p.id)))
        .collect();
    let mut taken = vec![false; pool.len()];
    let mut used_mod = HashSet::new();
    let mut used_tech = HashSet::new();
    let mut out = Vec::new();

    while out.len() < n {
        let Some(i) = sample(
            &weights,
            |i| !taken[i] && !used_mod.contains(&pool[i].module),
            rng,
        ) else {
            break;
        };
        taken[i] = true;
        used_mod.insert(pool[i].module);
        used_tech.insert((pool[i].module, pool[i].technique));
        out.push(pool[i]);
    }
    while out.len() < n {
        let Some(i) = sample(
            &weights,
            |i| !taken[i] && !used_tech.contains(&(pool[i].module, pool[i].technique)),
            rng,
        ) else {
            break;
        };
        taken[i] = true;
        used_tech.insert((pool[i].module, pool[i].technique));
        out.push(pool[i]);
    }
    while out.len() < n {
        let Some(i) = sample(&weights, |i| !taken[i], rng) else {
            break;
        };
        taken[i] = true;
        out.push(pool[i]);
    }
    out
}

pub fn checkpoint_size(c: &Catalog, through: u64) -> usize {
    c.modules
        .iter()
        .filter(|m| in_slice(m, through))
        .count()
        .min(5)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::{attempt, day, good_catalog};

    fn none() -> HashMap<String, State> {
        HashMap::new()
    }

    #[test]
    fn pick_distinct_techniques_deterministic() {
        let c = good_catalog();
        let a = pick(&c, &none(), &[], 3, day(19), &mut Rng::new(7));
        let b = pick(&c, &none(), &[], 3, day(19), &mut Rng::new(7));
        assert_eq!(a.len(), 3);
        let ids = |ps: &[&Problem]| ps.iter().map(|p| p.id.clone()).collect::<Vec<_>>();
        assert_eq!(ids(&a), ids(&b), "not deterministic for one seed");
        let techs: HashSet<_> = a.iter().map(|p| (p.module, p.technique)).collect();
        assert_eq!(techs.len(), 3, "techniques not distinct: {:?}", ids(&a));
    }

    #[test]
    fn pick_prefers_weak() {
        let c = good_catalog();
        let st = |status, rung| State {
            status,
            rung,
            ..State::default()
        };
        let states = HashMap::from([
            ("p-one".to_string(), st(Status::Learning, 0)),
            ("p-two".to_string(), st(Status::Mastered, 3)),
            ("p-three".to_string(), st(Status::Mastered, 4)),
            ("two-sum".to_string(), st(Status::Mastered, 4)),
        ]);
        let attempts = [Attempt {
            end: Some(day(15)),
            ..attempt("p-one", Outcome::Fail)
        }];
        let mut rng = Rng::new(1);
        let mut counts: HashMap<String, usize> = HashMap::new();
        for _ in 0..1000 {
            let p = pick(&c, &states, &attempts, 1, day(19), &mut rng)[0];
            *counts.entry(p.id.clone()).or_default() += 1;
        }
        let n = |id: &str| counts.get(id).copied().unwrap_or(0);
        assert!(n("p-one") > n("p-two") * 3, "counts = {counts:?}");
    }

    #[test]
    fn pick_more_than_available() {
        let c = good_catalog();
        assert_eq!(
            pick(&c, &none(), &[], 10, day(19), &mut Rng::new(1)).len(),
            4
        );
    }

    #[test]
    fn pick_skips_bank() {
        let c = good_catalog();
        for seed in 0..50 {
            for p in pick(&c, &none(), &[], 10, day(19), &mut Rng::new(seed)) {
                assert!(
                    !c.module_of(p).bank,
                    "interviews draw from the curriculum only"
                );
            }
        }
    }

    #[test]
    fn pick_checkpoint_covers_modules() {
        let c = good_catalog();
        let n = checkpoint_size(&c, 2);
        assert_eq!(n, 2);
        let got = pick_checkpoint(&c, &none(), 2, n, &mut Rng::new(3));
        assert_eq!(got.len(), 2);
        for p in &got {
            let m = c.module_of(p);
            assert!(m.number <= 2 && !m.bank, "out of slice: {}", p.id);
        }
        let mods: HashSet<_> = got.iter().map(|p| p.module).collect();
        assert_eq!(mods.len(), 2, "want one per module");
    }

    #[test]
    fn pick_checkpoint_respects_ceiling() {
        let c = good_catalog();
        let got = pick_checkpoint(&c, &none(), 1, 5, &mut Rng::new(1));
        assert!(!got.is_empty());
        for p in got {
            assert!(c.module_of(p).number <= 1, "{} is past ceiling", p.id);
        }
    }

    #[test]
    fn rng_float64_in_unit_range() {
        let mut rng = Rng::new(0);
        assert!(
            (0..1000)
                .map(|_| rng.float64())
                .all(|f| (0.0..1.0).contains(&f))
        );
    }
}
