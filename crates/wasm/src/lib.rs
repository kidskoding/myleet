//! Browser API over `myleet-core`. Everything is JSON in, JSON out so the TypeScript
//! side stays simple; see README.md for each function's shapes. History is the
//! `events.jsonl` text, and scheduling state is recomputed from it on every call.

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};
use myleet_core::catalog::{Catalog, Difficulty, Module};
use myleet_core::placement::{self, ItemResult};
use myleet_core::progress::{self, Event, kind, mode};
use myleet_core::schedule::{self, Attempt, State, Status};
use myleet_core::{checkpoint, godur, interview, savestate, session, stats};
use serde::Deserialize;
use serde_json::{Value, json};
use wasm_bindgen::prelude::*;

type Res = Result<String, String>;

fn js(r: Res) -> Result<String, JsError> {
    r.map_err(|e| JsError::new(&e))
}

fn zone(tz: &str) -> Result<TimeZone, String> {
    if tz.is_empty() {
        return Ok(TimeZone::system());
    }
    TimeZone::get(tz).map_err(|e| format!("time zone {tz:?}: {e}"))
}

fn instant(ms: f64) -> Result<Timestamp, String> {
    Timestamp::from_millisecond(ms as i64).map_err(|e| format!("time {ms}: {e}"))
}

fn ms(t: Option<Timestamp>) -> Value {
    t.map_or(Value::Null, |t| json!(t.as_millisecond()))
}

fn events(jsonl: &str) -> Vec<Event> {
    progress::parse_lines(jsonl, "events").0
}

fn line(kind: &str, mode: &str, data: BTreeMap<String, String>, now_ms: f64) -> Res {
    Ok(progress::to_line(&Event {
        time: instant(now_ms)?,
        kind: kind.into(),
        problem: String::new(),
        attempt: String::new(),
        mode: mode.into(),
        data,
    }))
}

fn state_json(st: &State) -> Value {
    json!({
        "status": st.status.as_str(),
        "rung": st.rung,
        "due_ms": ms(st.due),
        "last_ms": ms(st.last_finished),
        "first_ms": ms(st.first_finished),
        "attempts": st.attempts,
        "clean_passes": st.clean_passes,
        "fails": st.fails,
        "hint_attempts": st.hint_attempts,
        "best_secs": st.best_elapsed.as_secs(),
    })
}

fn item_json(it: &ItemResult) -> Value {
    json!({
        "topic": it.topic,
        "problem": it.problem_id,
        "module": it.module_id,
        "outcome": it.outcome.as_str(),
        "level": it.level.as_str(),
    })
}

fn sorted(set: std::collections::HashSet<String>) -> Vec<String> {
    let mut v: Vec<String> = set.into_iter().collect();
    v.sort();
    v
}

fn module_id(m: Option<&Module>) -> Value {
    m.map_or(Value::Null, |m| json!(m.id))
}

#[derive(Deserialize)]
struct PlacementInput {
    topic: String,
    problem: String,
    passed: bool,
    #[serde(default)]
    hints: u32,
    #[serde(default)]
    skipped: bool,
    #[serde(default)]
    over_time: bool,
}

#[derive(Deserialize)]
struct CheckpointInput {
    problem: String,
    passed: bool,
    #[serde(default)]
    hints: u32,
    #[serde(default)]
    skipped: bool,
}

/// A loaded catalog plus the per-call logic that needs it.
#[wasm_bindgen]
pub struct Trainer {
    catalog: Catalog,
}

impl Trainer {
    fn load(catalog_json: &str) -> Result<Trainer, String> {
        Ok(Trainer {
            catalog: Catalog::from_json(catalog_json, PathBuf::new())?,
        })
    }

    fn target(&self, id: &str) -> SignedDuration {
        let target = self
            .catalog
            .problem(id)
            .map_or(Difficulty::Medium.default_time_target(), |p| p.time_target);
        SignedDuration::try_from(target).unwrap_or(SignedDuration::ZERO)
    }

    fn history(&self, jsonl: &str) -> (Vec<Event>, Vec<Attempt>) {
        let evs = events(jsonl);
        let atts = schedule::attempts(&evs, |id| self.target(id));
        (evs, atts)
    }

    fn compute(&self, evs: &[Event], tz: &TimeZone) -> HashMap<String, State> {
        schedule::compute(evs, |id| self.target(id), tz)
    }

    fn module_of_id(&self, id: &str) -> Result<&Module, String> {
        let p = self
            .catalog
            .problem(id)
            .ok_or_else(|| format!("unknown problem {id:?}"))?;
        Ok(self.catalog.module_of(p))
    }

    fn today_json(&self, jsonl: &str, now_ms: f64, tz: &str, new_per_day: u32) -> Res {
        let tz = zone(tz)?;
        let evs = events(jsonl);
        let states = self.compute(&evs, &tz);
        let items = session::today(
            &self.catalog,
            &states,
            instant(now_ms)?,
            &tz,
            new_per_day,
            &evs,
        );
        let out: Vec<Value> = items
            .iter()
            .map(|it| {
                json!({
                    "problem": it.problem.id,
                    "index": it.problem.order,
                    "kind": it.kind.as_str(),
                    "reason": it.reason.map(|r| r.as_str()),
                    "overdue_days": it.overdue_days,
                    "state": state_json(&it.state),
                })
            })
            .collect();
        Ok(json!(out).to_string())
    }

    fn states_json(&self, jsonl: &str, tz: &str) -> Res {
        let tz = zone(tz)?;
        let states: BTreeMap<String, Value> = self
            .compute(&events(jsonl), &tz)
            .iter()
            .map(|(id, st)| (id.clone(), state_json(st)))
            .collect();
        Ok(json!(states).to_string())
    }

    fn save_text(&self, jsonl: &str, tz: &str) -> Res {
        let tz = zone(tz)?;
        let states = self.compute(&events(jsonl), &tz);
        Ok(savestate::render(&self.catalog, &states, &tz))
    }

    fn stats_json(&self, jsonl: &str, now_ms: f64, tz: &str) -> Res {
        let tz = zone(tz)?;
        let (evs, atts) = self.history(jsonl);
        let states = self.compute(&evs, &tz);
        let s = stats::compute(&self.catalog, &states, &atts, instant(now_ms)?, &tz);
        let counts: BTreeMap<&str, usize> = [
            Status::Unseen,
            Status::Learning,
            Status::Reviewing,
            Status::Mastered,
        ]
        .into_iter()
        .map(|st| (st.as_str(), s.counts.get(&st).copied().unwrap_or(0)))
        .collect();
        let heatmap: BTreeMap<String, usize> =
            s.heatmap.iter().map(|(d, n)| (d.to_string(), *n)).collect();
        let median: BTreeMap<&str, i64> = s
            .median_by_diff
            .iter()
            .map(|(d, t)| (d.as_str(), t.as_secs()))
            .collect();
        let weakest: Vec<Value> = s
            .weakest
            .iter()
            .map(|w| {
                json!({
                    "module": w.module.id,
                    "module_title": w.module.title,
                    "technique": w.technique.id,
                    "technique_title": w.technique.title,
                    "fail_rate": w.fail_rate,
                    "hint_rate": w.hint_rate,
                    "attempts": w.attempts,
                })
            })
            .collect();
        Ok(json!({
            "counts": counts,
            "mastery": s.mastery,
            "streak": s.streak,
            "heatmap": heatmap,
            "weakest": weakest,
            "median_secs": median,
        })
        .to_string())
    }

    fn placement_json(&self, jsonl: &str) -> Res {
        let (evs, atts) = self.history(jsonl);
        let items: Vec<Value> = placement::resolve(&self.catalog, placement::DEFAULT_SLOTS)
            .iter()
            .map(|it| json!({"topic": it.topic, "problem": it.problem.id}))
            .collect();
        let result = placement::load(&evs);
        Ok(json!({
            "needs": placement::needs(&evs, &atts),
            "done": placement::done(&evs),
            "items": items,
            "result": result.as_ref().map(|r| json!({
                "skipped": r.skipped,
                "items": r.items.iter().map(item_json).collect::<Vec<_>>(),
            })),
            "weak_modules": result.as_ref().map_or(vec![], |r| sorted(placement::weak_modules(r))),
            "recommend": module_id(result.as_ref().and_then(|r| placement::recommend(&self.catalog, r))),
        })
        .to_string())
    }

    fn placement_done_line(&self, results_json: &str, now_ms: f64) -> Res {
        let inputs: Vec<PlacementInput> =
            serde_json::from_str(results_json).map_err(|e| format!("results: {e}"))?;
        let mut items = Vec::with_capacity(inputs.len());
        for i in inputs {
            let outcome = placement::score(i.passed, i.hints, i.skipped, i.over_time);
            items.push(ItemResult {
                module_id: self.module_of_id(&i.problem)?.id.clone(),
                topic: i.topic,
                problem_id: i.problem,
                outcome,
                level: placement::level_of(outcome),
            });
        }
        line(
            kind::PLACEMENT_DONE,
            mode::PLACEMENT,
            placement::encode(&items),
            now_ms,
        )
    }

    fn checkpoint_json(&self, jsonl: &str) -> Res {
        let (evs, atts) = self.history(jsonl);
        let ceilings: Vec<Value> = checkpoint::ceiling_modules(&self.catalog)
            .iter()
            .map(|m| json!({"number": m.number, "id": m.id, "title": m.title}))
            .collect();
        let result = checkpoint::load(&evs);
        Ok(json!({
            "suggest_through": checkpoint::suggest_through(&self.catalog, &evs, &atts),
            "default_through": checkpoint::default_through(&self.catalog, &atts),
            "ceilings": ceilings,
            "result": result.as_ref().map(|r| json!({
                "through": r.through,
                "items": r.items.iter().map(item_json).collect::<Vec<_>>(),
            })),
            "weak_modules": result.as_ref().map_or(vec![], |r| sorted(checkpoint::weak_modules(r))),
            "recommend": module_id(result.as_ref().and_then(|r| checkpoint::recommend(&self.catalog, r))),
        })
        .to_string())
    }

    fn checkpoint_pick_json(&self, jsonl: &str, tz: &str, through: u32, seed: f64) -> Res {
        let tz = zone(tz)?;
        let states = self.compute(&events(jsonl), &tz);
        let through = u64::from(through);
        let n = interview::checkpoint_size(&self.catalog, through);
        let mut rng = interview::Rng::new(seed as u64);
        let ids: Vec<&str> =
            interview::pick_checkpoint(&self.catalog, &states, through, n, &mut rng)
                .iter()
                .map(|p| p.id.as_str())
                .collect();
        Ok(json!(ids).to_string())
    }

    fn checkpoint_done_line(&self, through: u32, results_json: &str, now_ms: f64) -> Res {
        let inputs: Vec<CheckpointInput> =
            serde_json::from_str(results_json).map_err(|e| format!("results: {e}"))?;
        let mut items = Vec::with_capacity(inputs.len());
        for i in inputs {
            let m = self.module_of_id(&i.problem)?;
            let outcome = checkpoint::score(i.passed, i.hints, i.skipped);
            items.push(ItemResult {
                topic: m.title.clone(),
                module_id: m.id.clone(),
                problem_id: i.problem,
                outcome,
                level: checkpoint::level_of(outcome),
            });
        }
        line(
            kind::CHECKPOINT_DONE,
            mode::CHECKPOINT,
            checkpoint::encode(u64::from(through), &items),
            now_ms,
        )
    }

    fn interview_pick_json(&self, jsonl: &str, tz: &str, n: u32, now_ms: f64, seed: f64) -> Res {
        let tz = zone(tz)?;
        let (evs, atts) = self.history(jsonl);
        let states = self.compute(&evs, &tz);
        let mut rng = interview::Rng::new(seed as u64);
        let ids: Vec<&str> = interview::pick(
            &self.catalog,
            &states,
            &atts,
            n as usize,
            instant(now_ms)?,
            &mut rng,
        )
        .iter()
        .map(|p| p.id.as_str())
        .collect();
        Ok(json!(ids).to_string())
    }
}

#[wasm_bindgen]
impl Trainer {
    /// `catalog_json` is `catalog.json` from `myleet export`.
    #[wasm_bindgen(constructor)]
    pub fn new(catalog_json: &str) -> Result<Trainer, JsError> {
        Trainer::load(catalog_json).map_err(|e| JsError::new(&e))
    }

    pub fn today(
        &self,
        events_jsonl: &str,
        now_ms: f64,
        tz: &str,
        new_per_day: u32,
    ) -> Result<String, JsError> {
        js(self.today_json(events_jsonl, now_ms, tz, new_per_day))
    }

    pub fn states(&self, events_jsonl: &str, tz: &str) -> Result<String, JsError> {
        js(self.states_json(events_jsonl, tz))
    }

    pub fn save_file(&self, events_jsonl: &str, tz: &str) -> Result<String, JsError> {
        js(self.save_text(events_jsonl, tz))
    }

    pub fn stats(&self, events_jsonl: &str, now_ms: f64, tz: &str) -> Result<String, JsError> {
        js(self.stats_json(events_jsonl, now_ms, tz))
    }

    pub fn placement(&self, events_jsonl: &str) -> Result<String, JsError> {
        js(self.placement_json(events_jsonl))
    }

    pub fn placement_done(&self, results_json: &str, now_ms: f64) -> Result<String, JsError> {
        js(self.placement_done_line(results_json, now_ms))
    }

    pub fn checkpoint(&self, events_jsonl: &str) -> Result<String, JsError> {
        js(self.checkpoint_json(events_jsonl))
    }

    pub fn checkpoint_pick(
        &self,
        events_jsonl: &str,
        tz: &str,
        through: u32,
        seed: f64,
    ) -> Result<String, JsError> {
        js(self.checkpoint_pick_json(events_jsonl, tz, through, seed))
    }

    pub fn checkpoint_done(
        &self,
        through: u32,
        results_json: &str,
        now_ms: f64,
    ) -> Result<String, JsError> {
        js(self.checkpoint_done_line(through, results_json, now_ms))
    }

    pub fn interview_pick(
        &self,
        events_jsonl: &str,
        tz: &str,
        n: u32,
        now_ms: f64,
        seed: f64,
    ) -> Result<String, JsError> {
        js(self.interview_pick_json(events_jsonl, tz, n, now_ms, seed))
    }
}

fn event_line_of(
    kind: &str,
    problem: &str,
    attempt: &str,
    mode: &str,
    data_json: &str,
    now_ms: f64,
) -> Res {
    let data: BTreeMap<String, String> = if data_json.trim().is_empty() {
        BTreeMap::new()
    } else {
        serde_json::from_str(data_json).map_err(|e| format!("data: {e}"))?
    };
    Ok(progress::to_line(&Event {
        time: instant(now_ms)?,
        kind: kind.into(),
        problem: problem.into(),
        attempt: attempt.into(),
        mode: mode.into(),
        data,
    }))
}

/// One `events.jsonl` line (no trailing newline); `data_json` is a string-to-string object.
#[wasm_bindgen]
pub fn event_line(
    kind: &str,
    problem: &str,
    attempt: &str,
    mode: &str,
    data_json: &str,
    now_ms: f64,
) -> Result<String, JsError> {
    js(event_line_of(
        kind, problem, attempt, mode, data_json, now_ms,
    ))
}

#[wasm_bindgen]
pub fn placement_skip(now_ms: f64) -> Result<String, JsError> {
    let data = BTreeMap::from([("skipped".to_string(), "1".to_string())]);
    js(line(kind::PLACEMENT_DONE, mode::PLACEMENT, data, now_ms))
}

#[wasm_bindgen]
pub fn checkpoint_snooze(through: u32, now_ms: f64) -> Result<String, JsError> {
    js(line(
        kind::CHECKPOINT_DONE,
        mode::CHECKPOINT,
        checkpoint::snooze(u64::from(through)),
        now_ms,
    ))
}

#[wasm_bindgen]
pub fn new_attempt_id() -> String {
    progress::new_attempt_id()
}

#[wasm_bindgen]
pub fn format_secs(secs: f64) -> String {
    godur::format_secs(SignedDuration::from_secs_f64(secs))
}

#[wasm_bindgen]
pub fn interview_rules() -> String {
    json!({
        "round_secs": interview::ROUND_LENGTH.as_secs(),
        "hint_penalty_secs": interview::HINT_PENALTY.as_secs(),
    })
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    const GOOD: &str = include_str!("../../../src/testdata/catalog/good.json");
    const CHICAGO: &str = "America/Chicago";

    fn ms_of(s: &str) -> f64 {
        s.parse::<Timestamp>().unwrap().as_millisecond() as f64
    }

    fn trainer() -> Trainer {
        Trainer::load(GOOD).unwrap()
    }

    fn ev(t: &str, kind: &str, problem: &str, data: &str) -> String {
        event_line_of(kind, problem, "a1", mode::PRACTICE, data, ms_of(t)).unwrap() + "\n"
    }

    fn passed_two_sum() -> String {
        ev("2026-10-20T15:00:00Z", kind::OPENED, "two-sum", "")
            + &ev(
                "2026-10-20T15:05:00Z",
                kind::PASSED,
                "two-sum",
                r#"{"elapsed_ms":"300000"}"#,
            )
    }

    fn parse(s: &str) -> Value {
        serde_json::from_str(s).unwrap()
    }

    #[test]
    fn today_offers_new_then_review() {
        let t = trainer();
        let fresh = parse(
            &t.today_json("", ms_of("2026-10-20T15:00:00Z"), CHICAGO, 2)
                .unwrap(),
        );
        let q = fresh.as_array().unwrap();
        assert_eq!(q.len(), 2);
        assert_eq!(q[0]["kind"], "new");
        let next_day = parse(
            &t.today_json(&passed_two_sum(), ms_of("2026-10-21T15:00:00Z"), CHICAGO, 0)
                .unwrap(),
        );
        assert_eq!(next_day[0]["problem"], "two-sum");
        assert_eq!(next_day[0]["kind"], "review");
        assert_eq!(next_day[0]["state"]["rung"], 0);
    }

    #[test]
    fn states_and_save_file_come_from_events() {
        let t = trainer();
        let states = parse(&t.states_json(&passed_two_sum(), CHICAGO).unwrap());
        assert_eq!(states["two-sum"]["status"], "learning");
        assert_eq!(states["two-sum"]["best_secs"], 300);
        let save = t.save_text(&passed_two_sum(), CHICAGO).unwrap();
        assert!(
            save.contains("[two-sum]\nrung = \"1d\"\ndue = 2026-10-21\n"),
            "{save}"
        );
    }

    #[test]
    fn stats_counts_every_status() {
        let s = parse(
            &trainer()
                .stats_json(&passed_two_sum(), ms_of("2026-10-20T20:00:00Z"), CHICAGO)
                .unwrap(),
        );
        assert_eq!(s["counts"]["learning"], 1);
        assert_eq!(s["counts"]["mastered"], 0);
        assert_eq!(s["streak"], 1);
        assert_eq!(s["heatmap"]["2026-10-20"], 1);
        assert_eq!(s["median_secs"]["easy"], 300);
    }

    #[test]
    fn placement_round_trip() {
        let t = trainer();
        let before = parse(&t.placement_json("").unwrap());
        assert_eq!(before["needs"], true);
        assert!(before["result"].is_null());
        let done = t
            .placement_done_line(
                r#"[{"topic":"arrays and hashing","problem":"two-sum","passed":false}]"#,
                ms_of("2026-10-20T15:00:00Z"),
            )
            .unwrap();
        let after = parse(&t.placement_json(&(done + "\n")).unwrap());
        assert_eq!(after["needs"], false);
        assert_eq!(after["result"]["items"][0]["level"], "start here");
        assert_eq!(after["weak_modules"], json!(["beta"]));
        assert_eq!(after["recommend"], "beta");
        assert!(
            t.placement_done_line(r#"[{"topic":"x","problem":"nope","passed":true}]"#, 0.0)
                .is_err()
        );
    }

    #[test]
    fn checkpoint_and_interview_picks_are_seeded() {
        let t = trainer();
        let a = t.checkpoint_pick_json("", CHICAGO, 2, 7.0).unwrap();
        assert_eq!(a, t.checkpoint_pick_json("", CHICAGO, 2, 7.0).unwrap());
        assert_eq!(parse(&a).as_array().unwrap().len(), 2);
        let now = ms_of("2026-10-20T15:00:00Z");
        let i = t.interview_pick_json("", CHICAGO, 2, now, 3.0).unwrap();
        assert_eq!(i, t.interview_pick_json("", CHICAGO, 2, now, 3.0).unwrap());
        let line = t
            .checkpoint_done_line(2, r#"[{"problem":"p-one","passed":true}]"#, now)
            .unwrap();
        let c = parse(&t.checkpoint_json(&(line + "\n")).unwrap());
        assert_eq!(c["result"]["through"], 2);
        assert_eq!(c["result"]["items"][0]["outcome"], "clean");
    }

    #[test]
    fn helpers() {
        assert_eq!(format_secs(252.4), "4m12s");
        assert_eq!(new_attempt_id().len(), 12);
        assert!(zone("Not/AZone").is_err());
        assert!(Trainer::load("{}").is_err());
        let l = event_line_of("opened", "two-sum", "a1", "practice", "", 0.0).unwrap();
        assert_eq!(
            l,
            r#"{"t":"1970-01-01T00:00:00Z","kind":"opened","problem":"two-sum","attempt":"a1","mode":"practice"}"#
        );
    }
}
