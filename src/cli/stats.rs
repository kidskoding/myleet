use std::io::Write;

use jiff::SignedDuration;

use super::{Term, Tone};
use crate::app::App;
use crate::catalog::Difficulty;
use crate::godur::format_secs;
use crate::schedule::Status;
use crate::stats;

pub fn run<O: Write>(a: &App, out: &mut Term<O>) -> u8 {
    let s = stats::compute(&a.catalog, a.states(), &a.attempts(), (a.now)(), &a.tz);
    let count = |st: Status| s.counts.get(&st).copied().unwrap_or(0);
    out.line(&format!(
        "{} {}",
        out.paint(Tone::Title, "streak"),
        out.paint(Tone::Accent, &s.streak.to_string())
    ));
    out.line(&format!(
        "{} {}  {} {}  {} {}  {} {}",
        out.paint(Tone::Pass, "mastered"),
        count(Status::Mastered),
        out.paint(Tone::Accent, "reviewing"),
        count(Status::Reviewing),
        out.paint(Tone::Due, "learning"),
        count(Status::Learning),
        out.paint(Tone::Muted, "unseen"),
        count(Status::Unseen),
    ));
    if !s.weakest.is_empty() {
        out.line(&out.paint(Tone::Title, "weakest techniques:"));
        for w in &s.weakest {
            let name = format!("{} / {}", w.module.title, w.technique.title);
            out.line(&format!(
                "  {name:<40} fail {:3.0}%  hint {:3.0}%  ({} attempts)",
                w.fail_rate * 100.0,
                w.hint_rate * 100.0,
                w.attempts
            ));
        }
    }
    for d in [Difficulty::Easy, Difficulty::Medium, Difficulty::Hard] {
        if let Some(m) = s.median_by_diff.get(&d) {
            let target = SignedDuration::try_from(d.default_time_target()).unwrap_or_default();
            out.line(&format!(
                "median {:<6} {} (target {})",
                d.as_str(),
                format_secs(*m),
                format_secs(target)
            ));
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::app::testenv::TestEnv;
    use crate::cli::call;
    use crate::progress::{Event, Log, kind, mode};

    #[test]
    fn stats_empty() {
        let e = TestEnv::new("good");
        let (code, out) = call(&e, &["stats"]);
        assert_eq!(code, 0, "{out}");
        assert!(
            out.contains("streak 0") && out.contains("unseen 4"),
            "{out}"
        );
    }

    #[test]
    fn stats_prints_medians_like_go_durations() {
        let e = TestEnv::new("good");
        let (log, _, _) = Log::open(&e.state().join("events.jsonl"));
        let t: jiff::Timestamp = "2026-10-19T15:00:00Z".parse().unwrap();
        let ev = |at: jiff::Timestamp, k: &str, data: &[(&str, &str)]| Event {
            time: at,
            kind: k.into(),
            problem: "p-one".into(),
            attempt: "a1".into(),
            mode: mode::PRACTICE.into(),
            data: data
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect::<BTreeMap<_, _>>(),
        };
        log.append(&ev(t, kind::OPENED, &[])).unwrap();
        let done = ev(
            t + jiff::SignedDuration::from_mins(5),
            kind::PASSED,
            &[("elapsed_ms", "252000")],
        );
        log.append(&done).unwrap();
        let (code, out) = call(&e, &["stats"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("median easy   4m12s (target 25m0s)"), "{out}");
    }
}
