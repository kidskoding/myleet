use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::mpsc;
use std::time::Duration;

use super::{Term, Tone};
use crate::app::App;
use crate::prompt::Status;

const PROMPT_WORKERS: usize = 4;
/// Stays polite to LeetCode's API.
const PROMPT_SPACING: Duration = Duration::from_millis(150);

pub fn run<O: Write>(a: &App, out: &mut Term<O>) -> u8 {
    let problems = a.catalog.problems();
    let mut counts: HashMap<Status, usize> = HashMap::new();
    let next = AtomicUsize::new(0);
    std::thread::scope(|s| {
        let (tx, rx) = mpsc::channel();
        for _ in 0..PROMPT_WORKERS {
            let tx = tx.clone();
            let next = &next;
            s.spawn(move || {
                while let Some(p) = problems.get(next.fetch_add(1, Ordering::Relaxed)) {
                    let status = a.prompts.get(p).status;
                    let _ = tx.send(status);
                    if status == Status::Fetched {
                        std::thread::sleep(PROMPT_SPACING);
                    }
                }
            });
        }
        drop(tx);
        // Printing stays on this thread so workers never share the writer.
        for status in rx {
            *counts.entry(status).or_default() += 1;
            let done: usize = counts.values().sum();
            if status == Status::Fetched && done % 25 == 0 {
                let dots = out.paint(Tone::Muted, "…");
                out.line(&format!("{dots} {done}/{}", problems.len()));
            }
        }
    });

    let n = |st: Status| counts.get(&st).copied().unwrap_or(0);
    out.line(&format!(
        "{} {} fetched, {} cached, {} written in the repo",
        out.ok_tag(),
        n(Status::Fetched),
        n(Status::Cached),
        n(Status::Authored)
    ));
    let note = out.paint(Tone::Due, "note");
    if n(Status::Premium) > 0 {
        out.line(&format!(
            "{note}  {} premium on LeetCode (statement not public; add a prompt in problem.toml)",
            n(Status::Premium)
        ));
    }
    if n(Status::NoSource) > 0 {
        out.line(&format!(
            "{note}  {} not on LeetCode (add a prompt in problem.toml)",
            n(Status::NoSource)
        ));
    }
    if n(Status::Offline) > 0 {
        out.line(&format!(
            "{}  {} could not be fetched; run again later",
            out.fail_tag(),
            n(Status::Offline)
        ));
        return 1;
    }
    0
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use crate::app::testenv::TestEnv;
    use crate::cli::call;
    use crate::testutil::serve;

    #[test]
    fn prompts_downloads_and_caches() {
        let mut e = TestEnv::new("good");
        let calls = Arc::new(AtomicUsize::new(0));
        let url = serve(calls.clone(), |_| {
            r#"{"data":{"question":{"isPaidOnly":false,"content":"<p>Find two numbers.</p>"}}}"#
                .to_string()
        });
        e.set("MYLEET_LEETCODE_ENDPOINT", url);
        let (code, out) = call(&e, &["prompts"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("2 fetched"), "{out}");
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        let (code, out) = call(&e, &["prompts"]);
        assert_eq!(code, 0, "{out}");
        assert!(out.contains("2 cached"), "second run: {out}");
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }
}
