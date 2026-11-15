//! Ports of focus_test.go, focus_layout_test.go, timer_test.go and the Focus
//! cases of fixes_test.go and sweep_test.go.

use std::sync::{Arc, Mutex};
use std::time::Instant;

use crossterm::event::{KeyModifiers, MouseEvent};
use ratatui::Terminal;
use ratatui::backend::TestBackend;

use super::*;
use crate::runner::TestResult;
use crate::tui::app::{App, FakePrompts, FakeRunner, KeyPress, test_shared};
use crate::tui::theme::assert_palette;

/// Mon oct 19 2026, 10:00 Chicago, like Go's testNow.
fn test_now() -> Timestamp {
    jiff::civil::date(2026, 10, 19)
        .at(10, 0, 0, 0)
        .to_zoned(crate::testutil::chicago())
        .unwrap()
        .timestamp()
}

fn test_result(name: &str, outcome: Outcome, message: &str) -> TestResult {
    TestResult {
        name: name.into(),
        outcome,
        message: message.into(),
        detail: String::new(),
    }
}

fn green() -> RunResult {
    RunResult {
        passed: 2,
        total: 2,
        tests: vec![
            test_result("test_add", Outcome::Passed, ""),
            test_result("test_add_negative", Outcome::Passed, ""),
        ],
        ..RunResult::default()
    }
}

fn red() -> RunResult {
    RunResult {
        passed: 1,
        total: 2,
        tests: vec![
            test_result("test_add", Outcome::Passed, ""),
            test_result("test_add_negative", Outcome::Failed, "assert 4 == 0"),
        ],
        ..RunResult::default()
    }
}

fn long_failure() -> RunResult {
    let mut tb: Vec<String> = (1..=40)
        .map(|i| format!("solution.py:{i}: in add  frame {i}"))
        .collect();
    tb.push("E   AssertionError: the very last line of the traceback".into());
    let mut res = red();
    res.tests[1].detail = tb.join("\n");
    res
}

type Clock = Arc<Mutex<Timestamp>>;

/// Shared with a fake runner, fake prompts and a clock the test can move.
fn shared(results: Vec<RunResult>, prompts: FakePrompts) -> (Shared, Arc<FakeRunner>, Clock) {
    let mut sh = test_shared();
    let runner = Arc::new(FakeRunner {
        results,
        ..FakeRunner::default()
    });
    sh.runner = runner.clone();
    sh.prompts = Arc::new(prompts);
    sh.app.tz = crate::testutil::chicago();
    let clock = Arc::new(Mutex::new(test_now()));
    let c = clock.clone();
    sh.app.now = Box::new(move || *c.lock().unwrap());
    (sh, runner, clock)
}

fn passed_events(id: &str, day: i64) -> Vec<Event> {
    let start = test_now() + SignedDuration::from_hours(24 * (day - 19));
    let att = crate::progress::new_attempt_id();
    let ev = |time, kind: &str, data| Event {
        time,
        kind: kind.into(),
        problem: id.into(),
        attempt: att.clone(),
        mode: mode::PRACTICE.into(),
        data,
    };
    vec![
        ev(start, kind::OPENED, BTreeMap::new()),
        ev(
            start + SignedDuration::from_mins(5),
            kind::PASSED,
            super::data(&[("elapsed_ms", "300000")]),
        ),
    ]
}

/// Drives one Focus the way the app would, without the frame.
struct H {
    sh: Shared,
    f: Focus,
    runner: Arc<FakeRunner>,
    clock: Clock,
    popped: bool,
    copied: Option<String>,
    exec: bool,
}

impl H {
    fn new(sh: Shared, runner: Arc<FakeRunner>, clock: Clock, id: &str, mode: &'static str) -> H {
        let p = sh.app.catalog.problem(id).expect("fixture problem").clone();
        let f = Focus::new(&sh, &p, mode);
        let mut h = H {
            sh,
            f,
            runner,
            clock,
            popped: false,
            copied: None,
            exec: false,
        };
        let c = h.f.init(&mut h.sh);
        h.apply(c);
        h.pump();
        h
    }

    fn open(id: &str, results: Vec<RunResult>) -> H {
        H::with(id, results, FakePrompts::default())
    }

    fn with(id: &str, results: Vec<RunResult>, prompts: FakePrompts) -> H {
        let (sh, runner, clock) = shared(results, prompts);
        H::new(sh, runner, clock, id, mode::PRACTICE)
    }

    fn apply(&mut self, c: Cmd) {
        match c {
            Cmd::Pop => {
                self.popped = true;
                self.f.close(&mut self.sh);
            }
            Cmd::Copy(t) => self.copied = Some(t),
            Cmd::Exec(..) => self.exec = true,
            Cmd::Batch(cs) => cs.into_iter().for_each(|c| self.apply(c)),
            _ => {}
        }
    }

    fn send(&mut self, msg: Msg) {
        let c = self.f.update(&mut self.sh, &msg);
        self.apply(c);
        self.pump();
    }

    fn pump(&mut self) {
        loop {
            let msgs = self.sh.queued();
            if msgs.is_empty() {
                return;
            }
            for m in msgs {
                let c = self.f.update(&mut self.sh, &m);
                self.apply(c);
            }
        }
    }

    fn keys(&mut self, keys: &[&str]) {
        for k in keys {
            self.send(Msg::Key(KeyPress::named(k)));
        }
    }

    fn custom(&mut self, m: impl std::any::Any + Send) {
        self.send(Msg::Custom(Box::new(m)));
    }

    fn lines(&self, w: usize, h: usize) -> Lines {
        self.f.view(&self.sh, w, h)
    }

    fn view(&self, w: usize, h: usize) -> String {
        let ls = self.lines(w, h);
        assert_fits(&ls, w, h);
        ls.iter().map(ui::plain).collect::<Vec<_>>().join("\n")
    }

    fn narrow(&self) -> String {
        self.view(80, 20)
    }

    fn wide(&self) -> String {
        self.view(120, 29)
    }

    fn kinds(&self) -> Vec<String> {
        self.sh.app.events.iter().map(|e| e.kind.clone()).collect()
    }

    fn count(&self, k: &str) -> usize {
        self.sh.app.events.iter().filter(|e| e.kind == k).count()
    }

    fn calls(&self) -> usize {
        self.runner.calls.load(Ordering::SeqCst)
    }

    fn advance(&self, d: SignedDuration) {
        let mut c = self.clock.lock().unwrap();
        *c += d;
    }

    /// Edits the attempt file so the next run counts as the learner's work.
    fn touch(&self) {
        let path = self.sh.app.workspace.attempt_path(&self.f.p.id);
        let mut b = fs::read(&path).unwrap();
        b.extend_from_slice(b"\n# edit\n");
        fs::write(&path, b).unwrap();
    }
}

fn assert_fits(lines: &Lines, w: usize, h: usize) {
    assert!(lines.len() <= h, "{} lines, want <= {h}", lines.len());
    for (i, l) in lines.iter().enumerate() {
        assert!(
            l.width() <= w,
            "line {i} is {} wide, want <= {w}: {:?}",
            l.width(),
            ui::plain(l)
        );
    }
}

/// The app frame with a problem open, like Go's `New(s, id)`.
fn app_with(id: &str, results: Vec<RunResult>, prompts: FakePrompts) -> App {
    let (sh, _, _) = shared(results, prompts);
    let mut a = App::new(sh);
    a.open_problem(id);
    a.deliver(Instant::now());
    a
}

fn rows(a: &mut App, w: u16, h: u16) -> Vec<String> {
    a.resize(w.into(), h.into());
    let mut term = Terminal::new(TestBackend::new(w, h)).unwrap();
    term.draw(|f| a.draw(f)).unwrap();
    let buf = term.backend().buffer().clone();
    (0..h)
        .map(|y| {
            let mut row = String::new();
            let mut x = 0;
            while x < w {
                let cell = &buf[(x, y)];
                row.push_str(cell.symbol());
                x += ui::str_width(cell.symbol()).max(1) as u16;
            }
            row
        })
        .collect()
}

fn press(a: &mut App, keys: &[&str]) {
    for k in keys {
        a.update(Msg::Key(KeyPress::named(k)));
        a.deliver(Instant::now());
    }
}

fn golden(name: &str) -> Vec<String> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("internal/tui/testdata")
        .join(format!("{name}.golden"));
    fs::read_to_string(path)
        .unwrap()
        .split('\n')
        .map(|l| l.trim_end().to_string())
        .collect()
}

/// Go's goldens trim nothing but pad some rows; the terminal pads every row.
fn assert_golden(name: &str, got: &[String]) {
    let want = golden(name);
    let got: Vec<String> = got.iter().map(|l| l.trim_end().to_string()).collect();
    assert_eq!(
        got,
        want,
        "view differs from {name}.golden\n--- got ---\n{}\n--- want ---\n{}",
        got.join("\n"),
        want.join("\n")
    );
}

fn mouse(kind: MouseEventKind, row: usize) -> Msg {
    Msg::Mouse(MouseEvent {
        kind,
        column: 10,
        row: row as u16,
        modifiers: KeyModifiers::NONE,
    })
}

fn row_of(view: &str, want: &str) -> usize {
    view.split('\n')
        .position(|l| l.contains(want))
        .unwrap_or_else(|| panic!("no row contains {want:?}:\n{view}"))
}

// ---- focus_test.go ----

#[test]
fn open_records_opened_and_runs_silently() {
    let mut h = H::open("p-one", vec![red()]);
    assert_eq!(h.calls(), 1);
    assert_eq!(h.kinds(), ["opened"], "the run on open is not logged");
    h.touch();
    h.keys(&["space"]);
    assert_eq!(h.kinds(), ["opened", "test_run"]);
    assert!(h.narrow().contains("1/2"), "{}", h.narrow());
}

#[test]
fn file_change_reruns() {
    let mut h = H::open("p-one", vec![red()]);
    h.touch();
    let focus = h.f.id;
    h.custom(FileChanged { focus });
    assert_eq!((h.calls(), h.count(kind::TEST_RUN)), (2, 1));
    h.custom(FileChanged {
        focus: focus + 1000,
    });
    assert_eq!(h.calls(), 2, "another screen's save is ignored");
}

#[test]
fn first_green_records_pass_once() {
    let mut h = H::open("p-one", vec![red(), green()]);
    h.touch();
    h.keys(&["space", "space"]);
    assert_eq!(h.count(kind::PASSED), 1);
    assert!(h.f.green());
    assert!(h.narrow().contains("first pass"), "{}", h.narrow());
    let e =
        h.sh.app
            .events
            .iter()
            .find(|e| e.kind == kind::PASSED)
            .unwrap();
    assert_eq!(e.data["elapsed_ms"], "0");
    assert_eq!(h.sh.app.workspace.snapshots("p-one").unwrap().len(), 1);
}

#[test]
fn hint_makes_pass_unclean() {
    let mut h = H::open("p-one", vec![red(), green()]);
    h.keys(&["t"]);
    assert!(h.narrow().contains("use +"), "{}", h.narrow());
    h.touch();
    h.keys(&["space"]);
    assert!(h.narrow().contains("back to 1d"), "{}", h.narrow());
    assert_eq!(h.count(kind::HINT_REVEALED), 1);
}

#[test]
fn esc_without_run_records_left() {
    let mut a = app_with("p-one", vec![red()], FakePrompts::default());
    assert_eq!(a.top().kind(), Kind::Focus);
    press(&mut a, &["esc"]);
    assert_eq!((a.depth(), a.top().kind()), (1, Kind::Home));
    let kinds: Vec<&str> = a.sh.app.events.iter().map(|e| e.kind.as_str()).collect();
    assert_eq!(kinds, ["opened", "left"]);
    assert_eq!(
        status_of(a.sh.app.states(), "p-one").status,
        crate::schedule::Status::Unseen
    );
}

#[test]
fn reset_confirm() {
    let mut h = H::open("p-one", vec![red()]);
    let path = h.sh.app.workspace.attempt_path("p-one");
    fs::write(&path, "edited\n").unwrap();
    h.keys(&["r"]);
    assert!(
        h.narrow().contains("Reset to the starter?"),
        "{}",
        h.narrow()
    );
    h.keys(&["n"]);
    assert_eq!(
        fs::read_to_string(&path).unwrap(),
        "edited\n",
        "n must not reset"
    );
    h.keys(&["r", "y"]);
    assert!(
        fs::read_to_string(&path)
            .unwrap()
            .contains("NotImplementedError")
    );
    assert_eq!(h.count(kind::RESET), 1);
}

#[test]
fn give_up() {
    let mut h = H::open("p-one", vec![red()]);
    h.keys(&["g"]);
    assert!(h.popped, "give up should leave");
    assert_eq!((h.count(kind::GAVE_UP), h.count(kind::LEFT)), (1, 0));
}

#[test]
fn solution_peek() {
    let mut h = H::open("p-one", vec![red()]);
    h.keys(&["s"]);
    assert!(h.narrow().contains("return a + b"), "{}", h.narrow());
    assert_eq!(h.count(kind::SOLUTION_PEEKED), 1);
    h.keys(&["s", "s"]);
    assert_eq!(h.count(kind::SOLUTION_PEEKED), 1, "one peek per attempt");
    let mut two = H::open("p-two", vec![red()]);
    two.keys(&["s"]);
    assert_eq!(two.count(kind::SOLUTION_PEEKED), 0, "p-two has no solution");
}

#[test]
fn diff_no_earlier_attempt() {
    let mut h = H::open("p-one", vec![red()]);
    h.keys(&["d"]);
    assert!(h.narrow().contains("no earlier attempt"), "{}", h.narrow());
}

#[test]
fn golden_80x24() {
    let mut a = app_with("p-one", vec![red()], FakePrompts::default());
    let r = rows(&mut a, 80, 24);
    assert_golden("focus", &r);
}

#[test]
fn shows_fetched_statement() {
    let h = H::with(
        "p-one",
        vec![red()],
        FakePrompts {
            md: "Add **two** numbers.".into(),
            status: prompt::Status::Fetched,
        },
    );
    let v = h.narrow();
    assert!(
        v.contains("Add two numbers.") && !v.contains("Key idea") && !v.contains("add them"),
        "{v}"
    );
}

fn fetched(md: &str) -> FakePrompts {
    FakePrompts {
        md: md.into(),
        status: prompt::Status::Fetched,
    }
}

fn status(s: prompt::Status) -> FakePrompts {
    FakePrompts {
        md: String::new(),
        status: s,
    }
}

#[test]
fn key_idea_becomes_last_hint() {
    let mut h = H::with("p-one", vec![red()], fetched("Add two numbers."));
    assert!(h.f.keys().contains(&Key::new("t", "hint 1/2")));
    h.keys(&["t", "t"]);
    assert!(h.narrow().contains("key idea: add them"), "{}", h.narrow());
    assert_eq!(h.count(kind::HINT_REVEALED), 2);
    h.keys(&["t"]);
    assert_eq!(h.count(kind::HINT_REVEALED), 2, "no hints left");
}

#[test]
fn premium_and_offline_fallbacks() {
    let h = H::with("two-sum", vec![red()], status(prompt::Status::Premium));
    assert!(h.narrow().contains("premium on LeetCode"), "{}", h.narrow());
    let h = H::with("two-sum", vec![red()], status(prompt::Status::Offline));
    assert!(
        h.narrow().contains("couldn't reach LeetCode"),
        "{}",
        h.narrow()
    );
}

#[test]
fn fetching_until_the_prompt_reports() {
    let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    let mut h = H::new(sh, runner, clock, "p-one", mode::PRACTICE);
    h.f.stmt_state = None;
    h.f.statement.clear();
    assert!(h.narrow().contains("fetching statement…"), "{}", h.narrow());
}

#[test]
fn no_snapshot_for_untouched_starter() {
    let mut h = H::open("p-two", vec![red()]);
    h.keys(&["esc"]);
    assert!(h.popped);
    assert!(h.sh.app.workspace.snapshots("p-two").unwrap().is_empty());
}

#[test]
fn review_starts_from_starter() {
    let (mut sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    for e in passed_events("p-one", 18) {
        sh.app.record(e).unwrap();
    }
    let path = sh.app.workspace.attempt_path("p-one");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "def add(a, b):\n    return a + b\n").unwrap();
    // Saved before yesterday's pass.
    let written = std::time::SystemTime::from(test_now() - SignedDuration::from_hours(48));
    fs::File::options()
        .write(true)
        .open(&path)
        .unwrap()
        .set_modified(written)
        .unwrap();
    let h = H::new(sh, runner, clock, "p-one", mode::PRACTICE);
    assert!(
        fs::read_to_string(&path)
            .unwrap()
            .contains("NotImplementedError")
    );
    assert_eq!(
        h.sh.app.workspace.snapshots("p-one").unwrap().len(),
        1,
        "the previous solution is kept as a snapshot"
    );
}

#[test]
fn unfinished_work_is_kept() {
    let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    let path = sh.app.workspace.attempt_path("p-one");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "half done\n").unwrap();
    let _h = H::new(sh, runner, clock, "p-one", mode::PRACTICE);
    assert_eq!(fs::read_to_string(&path).unwrap(), "half done\n");
}

#[test]
fn exams_always_start_cold() {
    let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    let path = sh.app.workspace.attempt_path("p-one");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "half done\n").unwrap();
    let h = H::new(sh, runner, clock, "p-one", mode::INTERVIEW);
    assert!(
        fs::read_to_string(&path)
            .unwrap()
            .contains("NotImplementedError")
    );
    assert_eq!(h.sh.app.workspace.snapshots("p-one").unwrap().len(), 1);
}

#[test]
fn editor_exit_without_change_is_not_logged() {
    let mut h = H::open("p-one", vec![green()]);
    h.keys(&["e"]);
    let focus = h.f.id;
    h.custom(EditorDone { focus, err: None });
    assert_eq!(
        h.count(kind::TEST_RUN) + h.count(kind::PASSED),
        0,
        "{:?}",
        h.kinds()
    );
    h.custom(EditorDone {
        focus,
        err: Some("exit status 1".into()),
    });
    assert!(
        h.narrow().contains("editor: exit status 1"),
        "{}",
        h.narrow()
    );
}

#[test]
fn editor_save_reruns_and_passes() {
    let mut h = H::open("p-one", vec![green()]);
    h.touch();
    let focus = h.f.id;
    h.custom(EditorDone { focus, err: None });
    assert_eq!(h.kinds(), ["opened", "test_run", "passed"]);
}

#[test]
fn offline_fallback_hides_key_idea() {
    let mut h = H::with("p-one", vec![red()], status(prompt::Status::Offline));
    let v = h.narrow();
    assert!(!v.contains("Key idea") && !v.contains("add them"), "{v}");
    h.keys(&["t", "t"]);
    assert!(h.narrow().contains("key idea: add them"), "{}", h.narrow());
}

// ---- focus_layout_test.go ----

#[test]
fn test_labels() {
    for (func, test, want) in [
        (
            "min_eating_speed",
            "test_min_eating_speed_one_pile",
            "one pile",
        ),
        ("add", "test_other_case", "other case"),
        ("add", "test_add", "add"),
        ("Codec", "test_codec_roundtrip", "roundtrip"),
        ("", "test_two_sum_basic", "two sum basic"),
    ] {
        assert_eq!(test_label(func, test), want, "{func} {test}");
    }
}

#[test]
fn solved_name_is_last_def_or_class() {
    let dir = tempfile::tempdir().unwrap();
    let p = dir.path().join("s.py");
    fs::write(
        &p,
        "class Node:\n    def inner(self):\n        pass\n\ndef solve(x):\n    pass\n",
    )
    .unwrap();
    assert_eq!(solved_name(&p), "solve");
    assert_eq!(solved_name(&dir.path().join("missing.py")), "");
}

#[test]
fn last_error_line_prefers_errors() {
    assert_eq!(
        last_error_line("a\nE  ValueError: x\nb"),
        "E  ValueError: x"
    );
    assert_eq!(last_error_line("a\nb\n"), "b");
    assert_eq!(last_error_line("  \n"), "");
}

#[test]
fn wide_has_sidebar() {
    let h = H::with("p-one", vec![red()], fetched("Add two numbers."));
    let v = h.wide();
    for want in [
        "╭─ timer",
        "⏱ 00:00 / 15:00",
        "✗ 1/2 passed",
        "✓ add",
        "✗ negative",
        "say it aloud",
        "Add two numbers.",
    ] {
        assert!(v.contains(want), "wide focus missing {want:?}:\n{v}");
    }
}

#[test]
fn narrow_is_stacked() {
    let h = H::open("p-one", vec![red()]);
    let v = h.narrow();
    assert!(
        v.contains('⏱') && v.contains("tests ●✗ 1/2") && !v.contains("╭─ timer"),
        "{v}"
    );
    let v = h.view(120, 29);
    assert!(
        v.contains("╭─ timer"),
        "resizing wide brings the sidebar back:\n{v}"
    );
}

#[test]
fn empty_statement_wide() {
    let h = H::open("p-one", vec![red()]);
    let v = h.wide();
    assert!(
        v.contains("say it aloud") && v.contains("complexity"),
        "{v}"
    );
}

#[test]
fn long_title_truncates() {
    let mut h = H::open("p-one", vec![red()]);
    h.f.p.title = "Very Long Problem Title ".repeat(7);
    assert!(h.narrow().contains('…'), "{}", h.narrow());
}

#[test]
fn pass_card() {
    let mut h = H::open("p-one", vec![red(), green()]);
    h.touch();
    h.keys(&["space"]);
    let ls = h.lines(120, 29);
    let v: Vec<String> = ls.iter().map(ui::plain).collect();
    let card = v
        .iter()
        .position(|l| l.contains("╭─ ✓ first pass"))
        .expect("success card");
    let border = &ls[card].spans[1];
    assert_eq!(border.content, "╭─ ");
    assert_eq!(
        border.style, h.sh.theme.pass,
        "the pass card border is green"
    );
    assert_palette(&ls);
}

#[test]
fn fail_card_shows_assertion() {
    let h = H::open("p-one", vec![red()]);
    let v = h.wide();
    for want in [
        "╭─ tests · 1/2 passed",
        "✗ negative",
        "assert 4 == 0",
        "✓ add",
    ] {
        assert!(v.contains(want), "tests window missing {want:?}:\n{v}");
    }
}

#[test]
fn reset_is_modal() {
    let mut h = H::open("p-one", vec![red()]);
    h.keys(&["r"]);
    let v = h.narrow();
    assert!(
        v.contains("╭─ reset") && v.contains("kept as a snapshot"),
        "{v}"
    );
    assert!(!h.f.wants_mouse());
    assert_eq!(h.f.keys(), [Key::new("y", "yes"), Key::new("n", "cancel")]);
}

#[test]
fn spinner_while_running() {
    let mut h = H::open("p-one", vec![red()]);
    h.f.running = true;
    h.f.frame = 3;
    assert!(h.narrow().contains("⠸"), "{}", h.narrow());
    let focus = h.f.id;
    let before = h.sh.timer_count();
    h.custom(Spin { focus });
    assert_eq!(h.f.frame, 4);
    assert_eq!(
        h.sh.timer_count(),
        before + 1,
        "a running spinner keeps ticking"
    );
    h.f.running = false;
    h.custom(Spin { focus });
    assert_eq!(
        h.sh.timer_count(),
        before + 1,
        "and stops once the run is done"
    );
}

#[test]
fn spinner_one_loop_per_run() {
    let mut h = H::open("p-one", vec![red()]);
    let before = h.sh.timer_count();
    h.f.running = true;
    h.f.run(&mut h.sh, false);
    assert_eq!(
        h.sh.timer_count(),
        before,
        "a run started while another is in flight must not start a second spinner loop"
    );
}

#[test]
fn golden_wide() {
    let md = "Given two integers `a` and `b`, return their sum.\n\n**Example 1:**\n\n```\nInput: a = 1, b = 2\nOutput: 3\n```";
    let mut a = app_with("p-one", vec![red()], fetched(md));
    assert_golden("focus_wide", &rows(&mut a, 120, 32));
}

#[test]
fn tests_window_scrolls_to_full_traceback() {
    for (w, hgt) in [(60, 17), (80, 21), (120, 29), (160, 37)] {
        let mut h = H::open("p-one", vec![long_failure()]);
        let v = h.view(w, hgt);
        assert!(
            !v.contains("very last line"),
            "{w}x{hgt}: starts at the top:\n{v}"
        );
        h.keys(&["tab", "end"]);
        let v = h.view(w, hgt);
        for want in ["very last line", "✓ add"] {
            assert!(
                v.contains(want),
                "{w}x{hgt}: tab+end should reveal {want:?}:\n{v}"
            );
        }
        h.keys(&["home"]);
        let v = h.view(w, hgt);
        assert!(
            v.contains("✗ negative"),
            "{w}x{hgt}: home returns to the first failure:\n{v}"
        );
    }
}

#[test]
fn zoom_gives_window_whole_body() {
    let mut h = H::open("p-one", vec![long_failure()]);
    h.keys(&["tab", "z"]);
    let v = h.narrow();
    assert!(!v.contains("╭─ problem") && v.contains("╭─ tests"), "{v}");
    h.keys(&["esc"]);
    assert!(
        !h.popped && h.narrow().contains("╭─ problem"),
        "esc unzooms before leaving"
    );
}

#[test]
fn scroll_moves_only_focused_window() {
    let mut h = H::open("p-one", vec![long_failure()]);
    h.keys(&["tab", "j", "j"]);
    let _ = h.narrow();
    assert_eq!((h.f.tests_top.get(), h.f.scroll.get()), (2, 0));
    h.keys(&["pgdown"]);
    assert!(h.f.tests_top.get() > 2, "pgdown pages the tests window");
}

#[test]
fn mouse_click_focuses_and_wheel_scrolls() {
    let mut h = H::open("p-one", vec![long_failure()]);
    assert!(h.f.wants_mouse());
    let y = row_of(&h.narrow(), "✗ negative");
    h.send(mouse(MouseEventKind::Down(MouseButton::Left), y));
    assert_eq!(h.f.win, Window::Tests);
    h.send(mouse(MouseEventKind::ScrollDown, y));
    let v = h.narrow();
    assert_eq!((h.f.tests_top.get(), h.f.scroll.get()), (3, 0));
    let py = row_of(&v, "╭─ problem") + 1;
    h.send(mouse(MouseEventKind::Down(MouseButton::Left), py));
    assert_eq!(h.f.win, Window::Problem);
}

#[test]
fn copy_focused_window() {
    let mut h = H::open("p-one", vec![long_failure()]);
    h.keys(&["tab"]);
    let _ = h.narrow();
    h.keys(&["y"]);
    let text = h.copied.take().expect("y copies");
    assert!(
        text.starts_with("✗ negative") && text.contains("very last line"),
        "{text}"
    );
    assert_eq!(h.sh.toast_text(), "copied test output");
}

#[test]
fn narrow_keeps_keys_and_checklist() {
    for w in [60u16, 82] {
        let mut a = app_with("p-one", vec![red()], FakePrompts::default());
        let v = rows(&mut a, w, 24).join("\n");
        for want in [
            "esc back",
            "e edit",
            "space rerun",
            "[ ] complexity",
            "[ ] brute force",
        ] {
            assert!(v.contains(want), "width {w} lost {want:?}:\n{v}");
        }
    }
}

#[test]
fn key_bar_shows_only_core_keys() {
    let mut a = app_with("p-one", vec![red()], fetched("Add two numbers."));
    let ls = rows(&mut a, 120, 32);
    let bar = ls[30..].join("\n");
    for want in [
        "e edit",
        "space rerun",
        "t hint",
        "s solution",
        "p pause",
        "esc back",
    ] {
        assert!(bar.contains(want), "key bar missing {want:?}:\n{bar}");
    }
    for gone in ["zoom", "copy", "window", "diff"] {
        assert!(
            !bar.contains(gone),
            "key bar should leave {gone:?} to ? help:\n{bar}"
        );
    }
    press(&mut a, &["?"]);
    let help = rows(&mut a, 120, 32).join("\n");
    assert!(help.contains("zoom the focused window"), "{help}");
}

#[test]
fn link_line_does_not_split_the_key() {
    let h = H::with("two-sum", vec![], status(prompt::Status::Offline));
    let v = h.narrow();
    assert!(
        !v.contains("(press") && v.contains("https://leetcode.com/problems/two-sum/"),
        "{v}"
    );
}

// ---- timer_test.go ----

/// p-one with a fetched statement and the attempt clock started now.
fn clocked(results: Vec<RunResult>) -> H {
    let mut h = H::with("p-one", results, fetched("Add two numbers."));
    h.f.start = test_now();
    h
}

#[test]
fn pause_stops_clock_and_hides_problem() {
    let mut h = clocked(vec![red()]);
    h.advance(SignedDuration::from_mins(2));
    h.keys(&["p"]);
    h.advance(SignedDuration::from_mins(10));
    assert_eq!(h.f.elapsed(&h.sh), SignedDuration::from_mins(2));
    let v = h.narrow();
    assert!(
        v.contains("paused") && !v.contains("Add two numbers."),
        "{v}"
    );
    assert_eq!(h.f.keys()[0], Key::new("p", "resume"));
    let calls = h.calls();
    h.keys(&["p"]);
    assert_eq!(h.calls(), calls + 1, "resuming reruns the tests");
    h.advance(SignedDuration::from_mins(1));
    assert_eq!(h.f.elapsed(&h.sh), SignedDuration::from_mins(3));
    assert!(h.narrow().contains("Add two numbers."));
}

#[test]
fn paused_save_does_not_run_tests() {
    let mut h = clocked(vec![red(), green()]);
    h.keys(&["p"]);
    let runs = h.f.seq;
    let focus = h.f.id;
    h.custom(FileChanged { focus });
    h.custom(EditorDone { focus, err: None });
    assert_eq!(h.f.seq, runs, "saving while paused must not run tests");
}

#[test]
fn restart_timer_confirms_and_records() {
    let mut h = clocked(vec![red()]);
    h.advance(SignedDuration::from_mins(7));
    h.keys(&["R"]);
    assert!(h.narrow().contains("restart timer"), "{}", h.narrow());
    assert!(h.f.owns_key("q"));
    h.keys(&["n"]);
    assert_eq!(h.f.elapsed(&h.sh), SignedDuration::from_mins(7));
    h.keys(&["R", "y"]);
    assert_eq!(h.f.elapsed(&h.sh), SignedDuration::ZERO);
    assert!(h.f.restarted);
    assert_eq!(h.count(kind::TIMER_RESTARTED), 1);
}

#[test]
fn exam_modes_cannot_pause_restart_peek_or_give_up() {
    for m in [mode::INTERVIEW, mode::PLACEMENT, mode::CHECKPOINT] {
        let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
        let mut h = H::new(sh, runner, clock, "p-one", m);
        h.keys(&["p", "R", "y", "s", "g"]);
        assert!(h.f.paused_at.is_none() && !h.f.restarted, "{m}");
        assert_eq!(
            h.count(kind::SOLUTION_PEEKED) + h.count(kind::GAVE_UP),
            0,
            "{m}"
        );
        assert!(!h.popped, "{m}");
        assert_eq!(h.f.hint_list(), ["use +"], "{m}: the key idea stays hidden");
        assert!(
            h.narrow().contains("??? hidden") || m == mode::CHECKPOINT,
            "{m}"
        );
    }
}

#[test]
fn interview_hint_adds_penalty() {
    let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    let mut h = H::new(sh, runner, clock, "p-one", mode::INTERVIEW);
    h.keys(&["t"]);
    assert_eq!(h.f.penalties, interview::HINT_PENALTY);
    let e = h.sh.app.events.last().unwrap();
    assert_eq!(
        (e.kind.as_str(), e.data["penalty_ms"].as_str()),
        (kind::HINT_REVEALED, "180000")
    );
    assert_eq!(h.f.title(), "timed");
}

#[test]
fn time_up_ends_practice_attempt() {
    let mut h = clocked(vec![red(), green()]);
    h.advance(h.f.target + SignedDuration::from_secs(1));
    h.send(Msg::Tick);
    assert!(h.f.time_up);
    assert_eq!(h.f.elapsed(&h.sh), h.f.target);
    let v = h.narrow();
    assert!(v.contains("time's up"), "{v}");
    assert!(!h.f.keys().contains(&Key::new("e", "edit")));
    let runs = h.f.seq;
    h.touch();
    let focus = h.f.id;
    h.keys(&["e", "space", "p"]);
    h.custom(FileChanged { focus });
    assert!(
        h.f.seq == runs && !h.f.paused() && !h.exec,
        "nothing may edit, rerun or pause"
    );
    let gave = h
        .sh
        .app
        .events
        .iter()
        .filter(|e| e.kind == kind::GAVE_UP && e.data.get("reason").is_some_and(|r| r == "time_up"))
        .count();
    assert_eq!(gave, 1);
    assert_eq!(h.count(kind::PASSED), 0);
    h.keys(&["esc"]);
    assert!(h.popped);
    assert_eq!(
        h.count(kind::LEFT),
        0,
        "leaving after time up records no second outcome"
    );
}

#[test]
fn drill_time_up_keeps_the_schedule() {
    let (sh, runner, clock) = shared(vec![red()], FakePrompts::default());
    let mut h = H::new(sh, runner, clock, "p-one", mode::DRILL);
    h.advance(h.f.target);
    h.send(Msg::Tick);
    assert_eq!(h.f.banner, "time's up · review schedule unchanged");
    assert!(h.narrow().contains("╭─ ✗ time's up"), "{}", h.narrow());
}

#[test]
fn paused_clock_does_not_time_out() {
    let mut h = clocked(vec![red()]);
    h.keys(&["p"]);
    h.advance(h.f.target * 2);
    h.send(Msg::Tick);
    assert!(!h.f.time_up);
}

// ---- fixes_test.go ----

#[test]
fn shows_syntax_error() {
    let broken = RunResult {
        total: 1,
        tests: vec![TestResult {
            name: "test_problem".into(),
            outcome: Outcome::Errored,
            message: "collection failure".into(),
            detail: "solution.py:1: in <module>\nE     def add(a, b)\nE                  ^\nE   SyntaxError: expected ':'".into(),
        }],
        ..RunResult::default()
    };
    let h = H::open("p-one", vec![broken]);
    assert!(
        h.narrow().contains("SyntaxError: expected ':'"),
        "{}",
        h.narrow()
    );
}

#[test]
fn run_errors_and_timeouts() {
    let err = RunResult {
        err: Some("no python configured".into()),
        output: "boom".into(),
        ..RunResult::default()
    };
    let h = H::open("p-one", vec![err]);
    let v = h.narrow();
    assert!(
        v.contains("tests could not run: no python configured") && v.contains("boom"),
        "{v}"
    );
    assert!(h.wide().contains("✗ could not run"), "{}", h.wide());
    let slow = RunResult {
        timed_out: true,
        ..RunResult::default()
    };
    let h = H::open("p-one", vec![slow]);
    assert!(
        h.narrow().contains("took longer than 10s"),
        "{}",
        h.narrow()
    );
    let fresh = RunResult {
        not_started: true,
        total: 2,
        tests: red().tests,
        ..RunResult::default()
    };
    let h = H::open("p-one", vec![fresh]);
    let v = h.narrow();
    assert!(
        v.contains("not started · press e to code") && v.contains("○ negative"),
        "{v}"
    );
}

#[test]
fn diff_against_previous_version() {
    let mut h = H::open("p-one", vec![red()]);
    let path = h.sh.app.workspace.attempt_path("p-one");
    fs::write(&path, "old line\n").unwrap();
    h.sh.app.workspace.snapshot("p-one", test_now()).unwrap();
    fs::write(&path, "new line\n").unwrap();
    h.sh.app
        .workspace
        .snapshot("p-one", test_now() + SignedDuration::from_mins(1))
        .unwrap();
    h.keys(&["d"]);
    let v = h.narrow();
    assert!(v.contains("-old line") && v.contains("+new line"), "{v}");
    assert!(v.contains("╭─ diff vs last version"), "{v}");
    h.keys(&["esc"]);
    assert!(
        !h.popped && h.narrow().contains("╭─ problem"),
        "esc closes the pane first"
    );
}

#[test]
fn q_during_reset_confirm_does_not_quit() {
    let mut a = app_with("p-one", vec![red()], FakePrompts::default());
    press(&mut a, &["r", "q"]);
    assert!(!a.should_quit(), "q answers the reset prompt");
    assert_eq!(a.depth(), 2);
}

#[test]
fn stale_run_is_ignored() {
    let mut h = H::open("p-one", vec![red()]);
    h.touch();
    h.keys(&["space"]);
    let focus = h.f.id;
    h.custom(RunDone {
        focus,
        res: green(),
        logged: true,
        seq: 1,
    });
    assert_eq!(
        h.count(kind::PASSED),
        0,
        "a stale result must not count as a pass"
    );
}

#[test]
fn narrow_shows_checklist() {
    let mut h = H::open("p-one", vec![red()]);
    h.keys(&["1"]);
    let v = h.narrow();
    assert!(
        v.contains("say it aloud") && v.contains("[x] brute force"),
        "{v}"
    );
    let e = h.sh.app.events.last().unwrap();
    assert_eq!(
        (e.kind.as_str(), e.data["item"].as_str()),
        (kind::SAY_ALOUD_CHECKED, "brute force")
    );
    h.keys(&["1", "9"]);
    assert_eq!(
        h.count(kind::SAY_ALOUD_CHECKED),
        1,
        "unticking and bad digits record nothing"
    );
}

#[test]
fn fail_card_stays_while_rerunning() {
    let mut h = H::open("p-one", vec![red()]);
    h.f.running = true;
    assert!(h.narrow().contains("assert 4 == 0"));
}

#[test]
fn help_modal_fits_short_terminal() {
    let mut a = app_with("p-one", vec![red()], FakePrompts::default());
    press(&mut a, &["?"]);
    assert!(rows(&mut a, 60, 20).join("\n").contains('╰'));
}

#[test]
fn open_url_and_close_snapshot() {
    let mut h = H::with("two-sum", vec![red()], FakePrompts::default());
    let opened = Arc::new(Mutex::new(Vec::new()));
    let o = opened.clone();
    h.sh.open = Box::new(move |u| {
        o.lock().unwrap().push(u.to_string());
        Err("no browser".into())
    });
    h.keys(&["o"]);
    assert_eq!(
        *opened.lock().unwrap(),
        ["https://leetcode.com/problems/two-sum/"]
    );
    assert!(h.narrow().contains("no browser"), "{}", h.narrow());
    h.touch();
    h.keys(&["esc"]);
    assert_eq!(
        h.sh.app.workspace.snapshots("two-sum").unwrap().len(),
        1,
        "edited work is snapshotted on leave"
    );
    assert_eq!(h.count(kind::LEFT), 1);
}

#[test]
fn drill_pass_keeps_schedule() {
    let (sh, runner, clock) = shared(vec![green()], FakePrompts::default());
    let mut h = H::new(sh, runner, clock, "p-one", mode::DRILL);
    h.touch();
    h.keys(&["space"]);
    assert!(
        h.f.banner.contains("review schedule unchanged"),
        "{}",
        h.f.banner
    );
    assert_eq!(h.f.title(), "drill");
    assert!(h.narrow().contains("keep sharp · one"), "{}", h.narrow());
}

// ---- sweep_test.go ----

#[test]
fn fits_all_sizes() {
    let mut h = H::open("p-one", vec![red()]);
    for w in 60..=160 {
        for hgt in (20..=40).step_by(5) {
            let ls = h.lines(w, hgt - 3);
            assert_fits(&ls, w, hgt - 3);
        }
    }
    h.keys(&["tab", "z"]);
    let _ = h.view(60, 17);
    let mut a = app_with("p-one", vec![red()], FakePrompts::default());
    for (w, hgt) in [(60, 20), (100, 25), (160, 40)] {
        assert_eq!(rows(&mut a, w, hgt).len(), hgt as usize);
    }
}
