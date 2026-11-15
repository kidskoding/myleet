use std::collections::BTreeMap;
use std::path::Path;

use jiff::{SignedDuration, Timestamp};
use ratatui::Terminal;
use ratatui::backend::TestBackend;

use super::app::{App, KeyPress, Msg, Shared, test_shared};
use crate::progress::{Event, kind, mode, new_attempt_id};
use crate::testutil::chicago;

pub fn test_now() -> Timestamp {
    jiff::civil::date(2026, 10, 19)
        .at(10, 0, 0, 0)
        .to_zoned(chicago())
        .unwrap()
        .timestamp()
}

fn ev(time: Timestamp, k: &str, problem: &str, attempt: &str, m: &str) -> Event {
    Event {
        time,
        kind: k.into(),
        problem: problem.into(),
        attempt: attempt.into(),
        mode: m.into(),
        data: BTreeMap::new(),
    }
}

pub fn passed_events(id: &str, day: i64) -> Vec<Event> {
    let start = test_now() + SignedDuration::from_hours(24 * (day - 19));
    let att = new_attempt_id();
    let mut passed = ev(
        start + SignedDuration::from_mins(5),
        kind::PASSED,
        id,
        &att,
        mode::PRACTICE,
    );
    passed.data.insert("elapsed_ms".into(), "300000".into());
    vec![ev(start, kind::OPENED, id, &att, mode::PRACTICE), passed]
}

pub fn placement_skipped() -> Event {
    let mut e = ev(test_now(), kind::PLACEMENT_DONE, "", "", mode::PLACEMENT);
    e.data.insert("skipped".into(), "1".into());
    e
}

pub fn checkpoint_snoozed() -> Event {
    let mut e = ev(test_now(), kind::CHECKPOINT_DONE, "", "", mode::CHECKPOINT);
    e.data.insert("through".into(), "99".into());
    e.data.insert("snoozed".into(), "1".into());
    e
}

pub fn shared(events: Vec<Event>) -> Shared {
    let mut sh = test_shared();
    sh.app.tz = chicago();
    sh.app.now = Box::new(test_now);
    for e in events {
        sh.app.record(e).unwrap();
    }
    sh
}

/// The frame on today's tab with placement and checkpoint out of the way.
pub fn app_with(mut events: Vec<Event>) -> App {
    events.splice(0..0, [placement_skipped(), checkpoint_snoozed()]);
    let mut a = App::new(shared(events));
    a.resize(80, 24);
    a
}

pub fn send(a: &mut App, keys: &[&str]) {
    for k in keys {
        a.update(Msg::Key(KeyPress::named(k)));
    }
}

pub fn typed(a: &mut App, s: &str) {
    for c in s.chars() {
        let name = if c == ' ' {
            "space".to_string()
        } else {
            c.to_string()
        };
        a.update(Msg::Key(KeyPress::named(&name)));
    }
}

/// The frame as plain text, one row per line with trailing spaces trimmed (the
/// goldens do not pad blank cells).
pub fn render(a: &mut App, w: u16, h: u16) -> String {
    a.resize(w.into(), h.into());
    let mut term = Terminal::new(TestBackend::new(w, h)).unwrap();
    term.draw(|f| a.draw(f)).unwrap();
    let buf = term.backend().buffer().clone();
    (0..h)
        .map(|y| {
            let row: String = (0..w).map(|x| buf[(x, y)].symbol().to_string()).collect();
            row.trim_end().to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn key_bar(view: &str) -> String {
    let ls: Vec<&str> = view.lines().collect();
    ls[ls.len().saturating_sub(2)..].join("\n")
}

/// Compares against a golden file with trailing spaces trimmed per line.
/// `UPDATE_GOLDEN=1 cargo test` rewrites it.
pub fn assert_golden(path: &Path, got: &str) {
    if std::env::var_os("UPDATE_GOLDEN").is_some() {
        std::fs::write(path, format!("{got}\n")).unwrap();
    }
    let want = std::fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("missing golden {}: {e}", path.display()));
    let want: Vec<&str> = want.lines().map(str::trim_end).collect();
    let got: Vec<&str> = got.lines().collect();
    assert_eq!(
        got.join("\n"),
        want.join("\n"),
        "view differs from {}",
        path.display()
    );
}

pub fn golden(name: &str) -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("src/testdata/golden/{name}.golden"))
}

pub fn assert_fits(view: &str, w: usize, h: usize) {
    let lines: Vec<&str> = view.lines().collect();
    assert!(lines.len() <= h, "{} lines, want <= {h}", lines.len());
    for (i, l) in lines.iter().enumerate() {
        let lw = super::ui::str_width(l);
        assert!(lw <= w, "line {i} is {lw} wide, want <= {w}: {l:?}");
    }
}
