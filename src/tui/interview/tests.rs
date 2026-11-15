//! Ports of interview_test.go and the interview cases of fixes_test.go,
//! sweep_test.go, timer_test.go and focus_layout_test.go.

use std::fs;
use std::sync::Arc;
use std::time::Instant;

use crossterm::event::{KeyModifiers, MouseButton, MouseEvent, MouseEventKind};
use jiff::ToSpan;
use ratatui::Terminal;
use ratatui::backend::TestBackend;

use super::*;
use crate::runner::{Outcome as Run, RunResult, TestResult};
use crate::tui::app::{App as Frame, FakeRunner, KeyPress};
use crate::tui::focus::Window;
use crate::tui::home::fixtures::*;
use crate::tui::theme::assert_palette;
use crate::tui::ui::{plain, str_width};

fn test(name: &str, outcome: Run, message: &str) -> TestResult {
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
            test("test_add", Run::Passed, ""),
            test("test_add_negative", Run::Passed, ""),
        ],
        ..RunResult::default()
    }
}

fn red() -> RunResult {
    RunResult {
        passed: 1,
        total: 2,
        tests: vec![
            test("test_add", Run::Passed, ""),
            test("test_add_negative", Run::Failed, "assert 4 == 0"),
        ],
        ..RunResult::default()
    }
}

fn long_failure() -> RunResult {
    let mut res = red();
    res.tests[1].detail = (1..=40)
        .map(|i| format!("solution.py:{i}: in add  frame {i}"))
        .collect::<Vec<_>>()
        .join("\n");
    res
}

fn one(_: &Shared, _: usize, _: &mut Rng) -> Vec<String> {
    vec!["p-one".into()]
}

fn two(_: &Shared, _: usize, _: &mut Rng) -> Vec<String> {
    vec!["p-one".into(), "p-two".into()]
}

fn runner(sh: &mut Shared, results: Vec<RunResult>) {
    sh.runner = Arc::new(FakeRunner {
        results,
        ..FakeRunner::default()
    });
}

/// Drives one Interview the way the app would, without the frame.
struct H {
    sh: Shared,
    iv: Interview,
    popped: bool,
}

impl H {
    fn setup(results: Vec<RunResult>, pick: Pick) -> H {
        let mut sh = shared_with(Vec::new());
        runner(&mut sh, results);
        let mut iv = Interview::new(&sh);
        iv.pick = pick;
        H {
            sh,
            iv,
            popped: false,
        }
    }

    /// A one-problem round on p-one, like Go's interviewModel.
    fn round(results: Vec<RunResult>) -> H {
        let mut h = H::setup(results, one);
        h.keys(&["enter"]);
        h
    }

    /// p-one then p-two, like Go's twoProblemRound.
    fn two(results: Vec<RunResult>) -> H {
        let mut h = H::setup(results, two);
        h.keys(&["l", "enter"]);
        h
    }

    fn apply(&mut self, c: Cmd) {
        match c {
            Cmd::Pop => {
                self.popped = true;
                self.iv.close(&mut self.sh);
            }
            Cmd::Batch(cs) => cs.into_iter().for_each(|c| self.apply(c)),
            _ => {}
        }
    }

    fn send(&mut self, msg: Msg) {
        let c = self.iv.update(&mut self.sh, &msg);
        self.apply(c);
        loop {
            let msgs = self.sh.queued();
            if msgs.is_empty() {
                return;
            }
            for m in msgs {
                let c = self.iv.update(&mut self.sh, &m);
                self.apply(c);
            }
        }
    }

    fn keys(&mut self, keys: &[&str]) {
        for k in keys {
            self.send(Msg::Key(KeyPress::named(k)));
        }
    }

    fn at(&mut self, d: jiff::Span) {
        set_now(&mut self.sh, test_now() + d);
    }

    fn time_out(&mut self) {
        self.at(46.minutes());
        self.send(Msg::Tick);
    }

    fn lines(&self, w: usize, h: usize) -> Lines {
        let ls = self.iv.view(&self.sh, w, h);
        assert_palette(&ls);
        assert!(ls.len() <= h, "{} lines, want <= {h}", ls.len());
        for l in &ls {
            assert!(
                l.width() <= w,
                "{} wide, want <= {w}: {:?}",
                l.width(),
                plain(l)
            );
        }
        ls
    }

    fn view(&self) -> String {
        self.lines(80, 20)
            .iter()
            .map(plain)
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn count(&self, k: &str) -> usize {
        self.sh.app.events.iter().filter(|e| e.kind == k).count()
    }
}

// ---- frame helpers ----

fn frame(results: Vec<RunResult>, pick: Option<Pick>) -> Frame {
    PICK.with(|p| p.set(pick));
    let mut sh = shared_with(Vec::new());
    runner(&mut sh, results);
    Frame::new(sh)
}

fn press(f: &mut Frame, keys: &[&str]) {
    for k in keys {
        f.update(Msg::Key(KeyPress::named(k)));
        f.deliver(Instant::now());
    }
}

/// Like the Focus tests' rows: wide symbols take two cells.
fn wide_rows(f: &mut Frame, w: u16, h: u16) -> Vec<String> {
    f.resize(w.into(), h.into());
    let mut term = Terminal::new(TestBackend::new(w, h)).unwrap();
    term.draw(|fr| f.draw(fr)).unwrap();
    let buf = term.backend().buffer().clone();
    (0..h)
        .map(|y| {
            let mut row = String::new();
            let mut x = 0;
            while x < w {
                let s = buf[(x, y)].symbol();
                row.push_str(s);
                x += str_width(s).max(1) as u16;
            }
            row.trim_end().to_string()
        })
        .collect()
}

fn assert_golden(name: &str, got: &[String]) {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("internal/tui/testdata")
        .join(format!("{name}.golden"));
    let want: Vec<String> = fs::read_to_string(path)
        .unwrap()
        .split('\n')
        .map(|l| l.trim_end().to_string())
        .collect();
    assert_eq!(
        got,
        want,
        "view differs from {name}.golden\n--- got ---\n{}\n--- want ---\n{}",
        got.join("\n"),
        want.join("\n")
    );
}

// ---- interview_test.go ----

#[test]
fn hides_technique() {
    let h = H::round(vec![red()]);
    let view = h.view();
    assert!(
        view.contains("??? hidden") && view.contains("problem 1 of 1"),
        "{view}"
    );
    for leak in ["alpha", "Alpha", "· one ·", "Key idea", "key idea"] {
        assert!(!view.contains(leak), "view leaks {leak:?}:\n{view}");
    }
}

#[test]
fn hint_penalty() {
    let mut h = H::round(vec![red()]);
    let before = h.iv.remaining(&h.sh);
    h.keys(&["t"]);
    assert_eq!(before - h.iv.remaining(&h.sh), interview::HINT_PENALTY);
    assert_eq!(
        h.iv.foci[0].clock,
        Some(interview::HINT_PENALTY),
        "the problem's clock pays too"
    );
}

#[test]
fn submit_green_records_pass() {
    let mut h = H::round(vec![green()]);
    h.keys(&["space"]);
    assert_eq!(h.count(kind::PASSED), 1);
    assert_eq!(h.sh.app.events.last().unwrap().mode, mode::INTERVIEW);
    assert_eq!(h.iv.phase, Phase::SelfCheck);
    assert!(h.view().contains("restated"), "{}", h.view());
}

#[test]
fn timeout_gives_up() {
    let mut h = H::round(vec![red()]);
    h.time_out();
    assert_eq!(h.count(kind::GAVE_UP), 1);
    assert_eq!(h.iv.phase, Phase::SelfCheck);
    assert_eq!(
        h.count(kind::LEFT),
        0,
        "interview problems must not record left"
    );
}

#[test]
fn reveal_shows_technique() {
    let mut h = H::round(vec![red()]);
    h.time_out();
    h.keys(&["2", "enter"]);
    let view = h.view();
    assert_eq!(h.iv.phase, Phase::Reveal);
    assert!(
        view.contains("Alpha · One") && view.contains("P One"),
        "{view}"
    );
    assert_eq!(h.count(kind::SAY_ALOUD_CHECKED), 1);
    h.keys(&["enter"]);
    assert!(h.popped, "enter on reveal goes back");
}

#[test]
fn quit_asks() {
    let mut h = H::round(vec![red()]);
    h.keys(&["q"]);
    assert!(h.view().contains("╭─ abandon round"), "{}", h.view());
    h.keys(&["n"]);
    assert!(
        !h.popped && h.iv.phase == Phase::Round,
        "any other key keeps going"
    );
    h.keys(&["q", "y"]);
    assert!(h.popped);
    assert_eq!(h.count(kind::GAVE_UP), 1);
}

#[test]
fn starts_from_starter() {
    let mut h = H::setup(vec![red()], one);
    let path = h.sh.app.workspace.attempt_path("p-one");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "def add(a, b):\n    return a + b\n").unwrap();
    h.keys(&["enter"]);
    let b = fs::read_to_string(&path).unwrap();
    assert!(
        b.contains("NotImplementedError"),
        "interviews always start cold, got {b:?}"
    );
}

#[test]
fn setup_card() {
    let mut f = frame(Vec::new(), None);
    press(&mut f, &["3"]);
    let view = wide_rows(&mut f, 80, 24).join("\n");
    for want in ["╭─ mock interview", "[1]", "[3]"] {
        assert!(view.contains(want), "{view}");
    }
    assert!(
        !view.contains("checkpoint"),
        "the timed tab offers no checkpoint mode:\n{view}"
    );
}

#[test]
fn stepper() {
    let h = H::two(vec![red()]);
    assert!(h.view().contains("● ○  problem 1 of 2"), "{}", h.view());
}

#[test]
fn countdown_red_under_5() {
    let mut h = H::two(vec![red()]);
    h.at(41.minutes());
    let lines = h.lines(100, 25);
    let span = lines[1]
        .spans
        .iter()
        .find(|s| s.content == "04:00 remaining")
        .expect("countdown");
    assert_eq!(span.style, h.sh.theme.fail.add_modifier(Modifier::BOLD));
    h.at(39.minutes());
    let lines = h.lines(100, 25);
    assert!(
        lines[1]
            .spans
            .iter()
            .any(|s| s.content == "06:00 remaining" && s.style == h.sh.theme.title)
    );
}

#[test]
fn reveal_cards() {
    let mut h = H::round(vec![red()]);
    h.time_out();
    h.keys(&["enter"]);
    let view = h.view();
    assert!(
        view.contains("╭─ P One") && view.contains("not passed"),
        "{view}"
    );
}

#[test]
fn goldens() {
    let mut f = frame(Vec::new(), None);
    press(&mut f, &["3"]);
    assert_golden("interview_setup", &wide_rows(&mut f, 80, 24));
    let mut f = frame(vec![red()], Some(two));
    press(&mut f, &["3", "l", "enter"]);
    assert_golden("interview_round", &wide_rows(&mut f, 100, 30));
}

#[test]
fn checkpoint_setup_and_reveal() {
    let mut sh = shared_with(vec![placement_skipped()]);
    runner(&mut sh, vec![green(), red()]);
    let iv = Interview::checkpoint(&sh);
    let mut h = H {
        sh,
        iv,
        popped: false,
    };
    assert!(h.view().contains("╭─ practice check-in"), "{}", h.view());
    assert_eq!(h.iv.tab(), Some(0), "check-ins stay on Today");
    h.iv.ceil_idx = 0;
    h.keys(&["enter"]);
    assert_eq!(h.iv.phase, Phase::Round);
    assert!(
        h.view().contains("· ???"),
        "module shown, technique hidden:\n{}",
        h.view()
    );
    for _ in 0..h.iv.foci.len() {
        h.keys(&["space"]);
    }
    assert_eq!(h.iv.phase, Phase::Reveal);
    let view = h.view();
    assert!(
        ["strong", "start here", "shaky"]
            .iter()
            .any(|l| view.contains(l)),
        "reveal missing levels:\n{view}"
    );
    assert!(view.contains("╭─ check-in through"), "{view}");
    let r = checkpoint::load(&h.sh.app.events).expect("checkpoint_done recorded");
    assert_eq!(r.through, h.iv.through);
    assert_eq!(r.items.len(), h.iv.foci.len());
    assert_eq!(
        r.items[0].outcome,
        Outcome::Clean,
        "the first problem ran green"
    );
    h.keys(&["enter"]);
    assert!(h.popped);
}

#[test]
fn checkpoint_abandon_stays_on_reveal() {
    let mut sh = shared_with(vec![placement_skipped()]);
    runner(&mut sh, vec![red()]);
    let iv = Interview::checkpoint(&sh);
    let mut h = H {
        sh,
        iv,
        popped: false,
    };
    h.keys(&["enter"]);
    let before = h.iv.remaining(&h.sh);
    h.keys(&["t"]);
    assert_eq!(h.iv.remaining(&h.sh), before, "check-in hints cost no time");
    assert_eq!(h.count(kind::HINT_REVEALED), 1);
    h.keys(&["q", "y"]);
    assert!(!h.popped);
    assert_eq!(h.iv.phase, Phase::Reveal);
    assert_eq!(h.count(kind::LEFT), h.iv.foci.len());
    let r = checkpoint::load(&h.sh.app.events).unwrap();
    assert!(r.items.iter().all(|it| it.outcome == Outcome::Skipped));
}

#[test]
fn home_check_in_stays_on_today() {
    let mut events = vec![placement_skipped()];
    for id in ["two-sum", "p-one", "p-two"] {
        events.extend(passed_events(id, 18));
    }
    let mut f = Frame::new(shared_with(events));
    press(&mut f, &["c"]);
    assert_eq!(f.top().title(), "check-in");
    assert_eq!(f.active_tab(), 0);
    press(&mut f, &["enter"]);
    assert!(f.wants_mouse(), "the check-in round is running");
}

// ---- fixes_test.go ----

#[test]
fn per_problem_clock() {
    let mut h = H::two(vec![green()]);
    h.at(10.minutes());
    h.keys(&["tab"]);
    h.at(15.minutes());
    h.keys(&["space"]);
    let e =
        h.sh.app
            .events
            .iter()
            .find(|e| e.kind == kind::PASSED && e.problem == "p-two")
            .expect("p-two pass");
    assert_eq!(
        e.data["elapsed_ms"], "300000",
        "p-two was worked on for 5 minutes"
    );
    assert_eq!(
        h.iv.foci[0].clock,
        Some(SignedDuration::from_mins(10)),
        "p-one froze at 10:00"
    );
}

#[test]
fn setup_digits_pick_count() {
    let mut h = H::setup(Vec::new(), one);
    h.keys(&["3", "3"]);
    assert_eq!(h.iv.n, 3);
    h.keys(&["h", "left", "left"]);
    assert_eq!(h.iv.n, 1);
    h.keys(&["right", "l", "l"]);
    assert_eq!(h.iv.n, 3);
}

#[test]
fn self_check_keeps_tab_keys() {
    let mut f = frame(vec![red()], Some(one));
    press(&mut f, &["3", "enter"]);
    set_now(&mut f.sh, test_now() + 46.minutes());
    f.update(Msg::Tick);
    press(&mut f, &["5", "tab"]);
    assert_eq!(f.active_tab(), 2);
    let view = wide_rows(&mut f, 80, 24).join("\n");
    assert!(view.contains("round over · be honest"), "{view}");
}

#[test]
fn round_key_bar_starts_with_edit() {
    let mut f = frame(vec![red()], Some(one));
    press(&mut f, &["3", "enter"]);
    let rows = wide_rows(&mut f, 80, 24);
    assert!(
        rows.iter()
            .rev()
            .any(|r| r.trim_start().starts_with("e edit")),
        "{rows:?}"
    );
}

// ---- timer_test.go / focus_layout_test.go ----

#[test]
fn exam_modes_cannot_pause_or_restart() {
    let mut h = H::round(vec![red()]);
    h.keys(&["p", "R", "y"]);
    assert!(!h.iv.foci[0].restarted, "timed rounds must not restart");
    assert!(
        !h.view().contains("clock stopped"),
        "timed rounds must not pause"
    );
}

#[test]
fn round_mouse_reaches_problem() {
    let mut h = H::round(vec![long_failure()]);
    let view = h.view();
    let y = view
        .lines()
        .position(|l| l.contains("✗ negative"))
        .expect("tests row");
    h.send(Msg::Mouse(MouseEvent {
        kind: MouseEventKind::Down(MouseButton::Left),
        column: 10,
        row: y as u16,
        modifiers: KeyModifiers::NONE,
    }));
    assert_eq!(h.iv.foci[0].win, Window::Tests);
    assert!(h.iv.wants_mouse(), "rounds turn on mouse reporting");
}

// ---- the rest of interview.go ----

#[test]
fn round_swallows_leave_keys() {
    let mut h = H::round(vec![red()]);
    for k in ["esc", "g", "s", "/"] {
        h.keys(&[k]);
    }
    assert!(!h.popped);
    assert_eq!(h.iv.phase, Phase::Round);
    assert!(h.iv.owns_key("q") && h.iv.owns_key("]") && !h.iv.owns_key("?"));
}

#[test]
fn close_mid_round_records_outcomes() {
    let mut h = H::two(vec![red()]);
    h.iv.close(&mut h.sh);
    assert_eq!(h.count(kind::GAVE_UP), 2);
    assert_eq!(h.iv.phase, Phase::SelfCheck);
}

#[test]
fn space_moves_to_next_unsubmitted() {
    let mut h = H::two(vec![red()]);
    h.keys(&["tab", "space"]);
    assert_eq!(h.iv.cur, 0, "back to the one left");
    assert!(h.view().contains("● ●  problem 1 of 2"), "{}", h.view());
    h.keys(&["space"]);
    assert_eq!(h.iv.phase, Phase::SelfCheck);
}

#[test]
fn empty_pick_stays_on_setup() {
    let mut h = H::setup(Vec::new(), |_, _, _| Vec::new());
    h.keys(&["enter"]);
    assert_eq!(h.iv.phase, Phase::Setup);
    assert_eq!(h.sh.toast_text(), "no problems to pick from");
    h.keys(&["esc"]);
    assert!(h.popped);
}

// ---- sweep_test.go ----

#[test]
fn fits_all_sizes() {
    for pick in [None, Some(one as Pick)] {
        let mut f = frame(vec![red()], pick);
        press(&mut f, &["3"]);
        if pick.is_some() {
            press(&mut f, &["enter"]);
        }
        for w in 60..=160 {
            for hgt in (20..=40).step_by(5) {
                let body = f.top().view(&f.sh, w, hgt - 3);
                assert!(body.len() <= hgt - 3, "{w}x{hgt}");
                assert!(body.iter().all(|l| l.width() <= w), "{w}x{hgt}");
                assert_eq!(wide_rows(&mut f, w as u16, hgt as u16).len(), hgt);
            }
        }
    }
    let mut h = H::two(vec![red()]);
    h.keys(&["q"]);
    let _ = h.lines(60, 17);
    h.keys(&["n"]);
    h.time_out();
    for (w, hgt) in [(60, 17), (80, 21), (160, 37)] {
        let _ = h.lines(w, hgt);
    }
    h.keys(&["enter"]);
    for (w, hgt) in [(60, 17), (80, 21), (160, 37)] {
        let _ = h.lines(w, hgt);
    }
}
