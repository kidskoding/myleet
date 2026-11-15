//! The problem screen: statement, timer, tests, hints and the attempt's events.
//! Ported from internal/tui/focus.go.

use std::cell::{Cell, RefCell};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use crossterm::event::{MouseButton, MouseEventKind};
use jiff::{SignedDuration, Timestamp};
use notify::RecommendedWatcher;
use ratatui::style::Style;
use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared};
use super::markdown::render_markdown;
use super::placement::FocusStatus;
use super::ui::{self, Key, Lines, Tone};
use super::widgets::{date_label, difficulty_badge, indent, mmss, status_of};
use crate::catalog::Problem;
use crate::progress::{Event, kind, mode};
use crate::prompt::{self, PromptResult};
use crate::runner::{Outcome, RunResult};
use crate::schedule::{RUNGS, State, local_day};
use crate::{editor, godur, interview, workspace};

const WATCH_DEBOUNCE: Duration = Duration::from_millis(150);
const SPIN_EVERY: Duration = Duration::from_millis(100);
const SIDEBAR_WIDTH: usize = 30;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Pane {
    Prompt,
    Solution,
    Diff,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Window {
    Problem = 0,
    Tests = 1,
}

const WINDOWS: [Window; 2] = [Window::Problem, Window::Tests];

/// Messages carry the screen's id, since every message reaches every screen.
pub(crate) struct RunDone {
    focus: u64,
    res: RunResult,
    logged: bool,
    seq: u64,
}
pub(crate) struct FileChanged {
    focus: u64,
}
pub(crate) struct EditorDone {
    focus: u64,
    err: Option<String>,
}
pub(crate) struct Spin {
    focus: u64,
}
pub(crate) struct PromptDone {
    focus: u64,
    res: PromptResult,
}

static NEXT_ID: AtomicU64 = AtomicU64::new(1);

pub(crate) struct Focus {
    id: u64,
    pub(crate) p: Problem,
    target: SignedDuration,
    pub(crate) mode: &'static str,
    pub(crate) attempt: String,
    start: Timestamp,
    path: Option<PathBuf>,

    last: RunResult,
    ran: bool,
    running: bool,
    green: bool,
    pub(crate) passed: bool,
    /// The final time once passed or out of time; interview rounds set it too.
    pub(crate) elapsed: SignedDuration,
    banner: String,
    pub(crate) hints: usize,
    peeked: bool,
    gave_up: bool,
    time_up: bool,
    closed: bool,
    confirm: bool,
    paused_at: Option<Timestamp>,
    paused_for: SignedDuration,
    pub(crate) restarted: bool,
    confirm_restart: bool,
    checked: Vec<bool>,
    pane: Pane,
    pane_text: String,
    scroll: Cell<usize>,
    pub(crate) win: Window,
    zoom: bool,
    tests_top: Cell<usize>,
    rows: Cell<[usize; 2]>,
    win_y: Cell<[(usize, usize); 2]>,
    shown: RefCell<[Vec<String>; 2]>,
    err: String,
    watcher: Option<RecommendedWatcher>,
    pub(crate) penalties: SignedDuration,
    statement: String,
    /// None until the statement fetch reports back.
    stmt_state: Option<prompt::Status>,
    /// Attempt content when the attempt started.
    baseline: Vec<u8>,
    /// Interview rounds time each problem themselves and set this before drawing.
    pub(crate) clock: Option<SignedDuration>,
    seq: u64,
    frame: i64,
    fn_name: String,
}

impl Focus {
    pub(crate) fn new(sh: &Shared, p: &Problem, mode: &'static str) -> Focus {
        Focus {
            id: NEXT_ID.fetch_add(1, Ordering::Relaxed),
            target: SignedDuration::try_from(p.time_target).unwrap_or(SignedDuration::ZERO),
            p: p.clone(),
            mode,
            attempt: crate::progress::new_attempt_id(),
            start: (sh.app.now)(),
            path: None,
            last: RunResult::default(),
            ran: false,
            running: false,
            green: false,
            passed: false,
            elapsed: SignedDuration::ZERO,
            banner: String::new(),
            hints: 0,
            peeked: false,
            gave_up: false,
            time_up: false,
            closed: false,
            confirm: false,
            paused_at: None,
            paused_for: SignedDuration::ZERO,
            restarted: false,
            confirm_restart: false,
            checked: vec![false; p.say_aloud.len()],
            pane: Pane::Prompt,
            pane_text: String::new(),
            scroll: Cell::new(0),
            win: Window::Problem,
            zoom: false,
            tests_top: Cell::new(0),
            rows: Cell::new([0; 2]),
            win_y: Cell::new([(0, 0); 2]),
            shown: RefCell::new([Vec::new(), Vec::new()]),
            err: String::new(),
            watcher: None,
            penalties: SignedDuration::ZERO,
            statement: String::new(),
            stmt_state: None,
            baseline: Vec::new(),
            clock: None,
            seq: 0,
            frame: 0,
            fn_name: String::new(),
        }
    }

    fn exam_mode(&self) -> bool {
        matches!(
            self.mode,
            mode::INTERVIEW | mode::PLACEMENT | mode::CHECKPOINT
        )
    }

    /// Open practice or a keep-sharp drill (hints, solution, give-up).
    fn practice_like(&self) -> bool {
        matches!(self.mode, mode::PRACTICE | mode::DRILL)
    }

    pub(crate) fn event(&self, sh: &Shared, kind: &str, data: BTreeMap<String, String>) -> Event {
        Event {
            time: (sh.app.now)(),
            kind: kind.into(),
            problem: self.p.id.clone(),
            attempt: self.attempt.clone(),
            mode: self.mode.into(),
            data,
        }
    }

    fn record(&self, sh: &mut Shared, kind: &str, data: BTreeMap<String, String>) {
        let e = self.event(sh, kind, data);
        record(sh, e);
    }

    /// Exam parents record outcomes themselves, so they need the attempt's state.
    fn report(&self, sh: &Shared) {
        if !self.exam_mode() {
            return;
        }
        let _ = sh.sender().send(Msg::Custom(Box::new(FocusStatus {
            problem_id: self.p.id.clone(),
            attempt: self.attempt.clone(),
            green: self.green,
            hints: self.hints as u32,
        })));
    }

    fn snapshot(&self, sh: &Shared) {
        let _ = sh.app.workspace.snapshot(&self.p.id, (sh.app.now)());
    }

    /// Otherwise a review would reopen yesterday's passing solution. Work edited
    /// after the last finished attempt is unfinished, so it is kept.
    fn should_start_cold(&self, sh: &Shared, path: &Path) -> bool {
        if self.exam_mode() {
            return true;
        }
        let st = status_of(sh.app.states(), &self.p.id);
        if st.rung < 0 {
            return false;
        }
        let modified = fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| Timestamp::try_from(t).ok());
        match (modified, st.last_finished) {
            (Some(m), Some(last)) => m <= last,
            (Some(_), None) => false,
            (None, _) => true,
        }
    }

    fn edited(&self, sh: &Shared) -> bool {
        let attempt = fs::read(sh.app.workspace.attempt_path(&self.p.id));
        let starter = fs::read(self.p.starter_path());
        match (attempt, starter) {
            (Ok(a), Ok(s)) => a != s,
            _ => true,
        }
    }

    fn run(&mut self, sh: &mut Shared, mut logged: bool) {
        let Some(path) = self.path.clone() else {
            return;
        };
        // An unedited file proves nothing, so its runs never count toward the ladder.
        if fs::read(&path).is_ok_and(|c| c == self.baseline) {
            logged = false;
        }
        let already_spinning = self.running;
        self.running = true;
        self.seq += 1;
        let (focus, seq, runner, test) = (self.id, self.seq, sh.runner.clone(), self.p.test_path());
        sh.spawn(move || {
            let res = runner.run(&test, &path);
            Msg::Custom(Box::new(RunDone {
                focus,
                res,
                logged,
                seq,
            }))
        });
        if !already_spinning {
            self.spin(sh);
        }
    }

    fn spin(&self, sh: &mut Shared) {
        sh.after(SPIN_EVERY, Msg::Custom(Box::new(Spin { focus: self.id })));
    }

    fn fetch_prompt(&self, sh: &Shared) {
        let (focus, src, p) = (self.id, sh.prompts.clone(), self.p.clone());
        sh.spawn(move || {
            Msg::Custom(Box::new(PromptDone {
                focus,
                res: src.get(&p),
            }))
        });
    }

    fn watch(&mut self, sh: &Shared, path: &Path) {
        let Some(watch) = sh.watch else {
            return;
        };
        let Ok(fw) = watch(path, WATCH_DEBOUNCE) else {
            return;
        };
        let (events, watcher) = fw.into_parts();
        self.watcher = Some(watcher);
        let (tx, focus) = (sh.sender(), self.id);
        // Ends when the watcher is dropped on close, which disconnects events.
        std::thread::spawn(move || {
            while events.recv().is_ok() {
                if tx
                    .send(Msg::Custom(Box::new(FileChanged { focus })))
                    .is_err()
                {
                    return;
                }
            }
        });
    }

    /// The key idea names the approach, so it is only offered as the last hint,
    /// and never in exams.
    pub(crate) fn hint_list(&self) -> Vec<String> {
        let mut hints = self.p.hints.clone();
        if !self.p.key_idea.is_empty() && !self.exam_mode() {
            hints.push(format!("key idea: {}", self.p.key_idea));
        }
        hints
    }

    pub(crate) fn elapsed(&self, sh: &Shared) -> SignedDuration {
        if self.passed || self.time_up {
            return self.elapsed;
        }
        if let Some(c) = self.clock {
            return c;
        }
        let now = self.paused_at.unwrap_or_else(|| (sh.app.now)());
        now.duration_since(self.start) - self.paused_for + self.penalties
    }

    pub(crate) fn green(&self) -> bool {
        self.green
    }

    fn paused(&self) -> bool {
        self.paused_at.is_some()
    }

    /// Exams keep a real interview clock.
    fn can_pause(&self) -> bool {
        self.practice_like() && !self.passed && !self.gave_up
    }

    fn toggle_pause(&mut self, sh: &mut Shared) {
        let now = (sh.app.now)();
        match self.paused_at.take() {
            None => self.paused_at = Some(now),
            Some(at) => {
                self.paused_for += now.duration_since(at);
                // Pick up anything saved while paused.
                self.run(sh, true);
            }
        }
    }

    /// Ends a practice attempt at its time target, so work past it cannot pass.
    fn expire(&mut self, sh: &mut Shared) {
        if self.time_up
            || !self.practice_like()
            || self.passed
            || self.gave_up
            || self.paused()
            || self.elapsed(sh) < self.target
        {
            return;
        }
        self.time_up = true;
        self.gave_up = true;
        self.elapsed = self.target;
        self.confirm = false;
        self.confirm_restart = false;
        self.record(sh, kind::GAVE_UP, data(&[("reason", "time_up")]));
        if self.mode == mode::DRILL {
            self.banner = "time's up · review schedule unchanged".into();
            return;
        }
        let due = self.due_label(sh, &status_of(sh.app.states(), &self.p.id));
        self.banner = format!(
            "time's up · {} reached · back to 1d · next {due}",
            mmss(self.target)
        );
    }

    fn due_label(&self, sh: &Shared, st: &State) -> String {
        // Go's zero time is Monday, January 1.
        st.due.map_or_else(
            || "mon jan 1".into(),
            |d| date_label(local_day(d, &sh.app.tz)),
        )
    }

    fn restart_timer(&mut self, sh: &mut Shared) {
        self.start = (sh.app.now)();
        self.paused_for = SignedDuration::ZERO;
        self.paused_at = None;
        self.restarted = true;
        self.record(sh, kind::TIMER_RESTARTED, BTreeMap::new());
    }

    fn finish_run(&mut self, sh: &mut Shared, res: RunResult, logged: bool) {
        self.running = false;
        self.ran = true;
        self.tests_top.set(0);
        self.green = res.green();
        if logged {
            let (passed, total) = (res.passed.to_string(), res.total.to_string());
            self.record(
                sh,
                kind::TEST_RUN,
                data(&[("passed", &passed), ("total", &total)]),
            );
        }
        self.last = res;
        if self.green {
            self.snapshot(sh);
        }
        self.report(sh);
        if self.green && logged && !self.passed && !self.time_up && !self.exam_mode() {
            self.record_pass(sh);
        }
    }

    fn record_pass(&mut self, sh: &mut Shared) {
        let before = status_of(sh.app.states(), &self.p.id);
        self.elapsed = self.elapsed(sh);
        self.passed = true;
        let ms = self.elapsed.as_millis().to_string();
        self.record(sh, kind::PASSED, data(&[("elapsed_ms", &ms)]));
        let after = status_of(sh.app.states(), &self.p.id);
        self.banner = self.banner_text(sh, &before, &after);
    }

    fn banner_text(&self, sh: &Shared, before: &State, after: &State) -> String {
        let att = sh
            .app
            .attempts()
            .into_iter()
            .rfind(|a| a.id == self.attempt);
        let (peeks, hints, restarts, clean) = att.map_or((0, 0, 0, false), |a| {
            (a.peeks, a.hints, a.restarts, a.clean)
        });
        let due = self.due_label(sh, after);
        if self.mode == mode::DRILL {
            return if peeks > 0 {
                "drill complete (solution peeked) · review schedule unchanged".into()
            } else if hints > 0 {
                "drill complete (hint used) · review schedule unchanged".into()
            } else if restarts > 0 {
                "drill complete (timer restarted) · review schedule unchanged".into()
            } else if !clean {
                "drill complete · review schedule unchanged".into()
            } else {
                format!("sharp · review schedule unchanged · next due {due}")
            };
        }
        let next = format!("next {due}");
        if peeks > 0 {
            format!("passed (solution peeked) · back to 1d · {next}")
        } else if hints > 0 {
            format!("passed (hint used) · back to 1d · {next}")
        } else if restarts > 0 {
            format!("passed (timer restarted) · back to 1d · {next}")
        } else if !clean {
            format!(
                "passed (over {}) · back to 1d · {next}",
                godur::format_secs(self.target)
            )
        } else if before.rung < 0 {
            format!("first pass · {next}")
        } else if after.rung > before.rung {
            format!(
                "clean pass · {}d → {}d · {next}",
                RUNGS[before.rung as usize], RUNGS[after.rung as usize]
            )
        } else {
            format!("clean pass · same day, no climb · {next}")
        }
    }

    fn handle_key(&mut self, sh: &mut Shared, k: &str) -> Cmd {
        if self.confirm_restart {
            self.confirm_restart = false;
            if k == "y" {
                self.restart_timer(sh);
            }
            return Cmd::None;
        }
        if self.paused() {
            match k {
                "p" => self.toggle_pause(sh),
                "R" => self.confirm_restart = true,
                "esc" => return Cmd::Pop,
                _ => {}
            }
            return Cmd::None;
        }
        if self.time_up && matches!(k, "e" | "space" | "t" | "p" | "R" | "r" | "g") {
            return Cmd::None;
        }
        if self.confirm {
            self.confirm = false;
            if k == "y" {
                if let Err(e) = sh.app.workspace.reset(&self.p) {
                    self.err = e.to_string();
                }
                self.record(sh, kind::RESET, BTreeMap::new());
                self.run(sh, false);
            }
            return Cmd::None;
        }
        match k {
            "p" => {
                if self.can_pause() {
                    self.toggle_pause(sh);
                }
            }
            "R" => {
                if self.can_pause() {
                    self.confirm_restart = true;
                }
            }
            "e" => {
                let path = self.path.clone().unwrap_or_default();
                match editor::command(&sh.app.config, &path) {
                    Ok(cmd) => {
                        let focus = self.id;
                        return Cmd::Exec(
                            cmd,
                            Box::new(move |res| {
                                Msg::Custom(Box::new(EditorDone {
                                    focus,
                                    err: res.err(),
                                }))
                            }),
                        );
                    }
                    Err(e) => self.err = e,
                }
            }
            "space" => self.run(sh, true),
            "t" => {
                if self.hints < self.hint_list().len() {
                    self.hints += 1;
                    let mut d = BTreeMap::new();
                    if self.mode == mode::INTERVIEW {
                        self.penalties += interview::HINT_PENALTY;
                        d.insert(
                            "penalty_ms".into(),
                            interview::HINT_PENALTY.as_millis().to_string(),
                        );
                    }
                    self.record(sh, kind::HINT_REVEALED, d);
                    self.report(sh);
                }
            }
            "s" => {
                if self.p.has_solution && self.practice_like() {
                    self.toggle_pane(sh, Pane::Solution);
                }
            }
            "d" => self.toggle_pane(sh, Pane::Diff),
            "o" => {
                if !self.p.url.is_empty()
                    && let Err(e) = (sh.open)(&self.p.url)
                {
                    self.err = e;
                }
            }
            "r" => self.confirm = true,
            "g" => {
                if self.practice_like() && !self.passed {
                    self.gave_up = true;
                    self.record(sh, kind::GAVE_UP, BTreeMap::new());
                    return Cmd::Pop;
                }
            }
            "tab" | "w" | "shift+tab" => self.win = other(self.win),
            "z" => self.zoom = !self.zoom,
            "y" => {
                let (name, i) = match self.win {
                    Window::Problem => ("problem", 0),
                    Window::Tests => ("test output", 1),
                };
                let text = self.shown.borrow()[i].join("\n");
                let text = text.trim_end_matches(['\n', ' ']).to_string();
                sh.toast(format!("copied {name}"));
                return Cmd::Copy(text);
            }
            "j" | "down" => self.scroll_by(1),
            "k" | "up" => self.scroll_by(-1),
            "pgdown" | "ctrl+d" => self.scroll_by(self.half_page()),
            "pgup" | "ctrl+u" => self.scroll_by(-self.half_page()),
            "home" => self.scroll_by(-(1 << 30)),
            // Clamped to the last page when drawn.
            "end" => self.scroll_by(1 << 30),
            "esc" => {
                if self.zoom {
                    self.zoom = false;
                    return Cmd::None;
                }
                if self.pane != Pane::Prompt {
                    self.pane = Pane::Prompt;
                    self.scroll.set(0);
                    return Cmd::None;
                }
                return Cmd::Pop;
            }
            _ => {
                if let Ok(n) = k.parse::<usize>()
                    && (1..=self.checked.len()).contains(&n)
                {
                    self.checked[n - 1] = !self.checked[n - 1];
                    if self.checked[n - 1] {
                        let item = self.p.say_aloud[n - 1].clone();
                        self.record(sh, kind::SAY_ALOUD_CHECKED, data(&[("item", &item)]));
                    }
                }
            }
        }
        Cmd::None
    }

    fn half_page(&self) -> i64 {
        (self.rows.get()[self.win as usize] as i64 / 2).max(1)
    }

    fn scroll_by(&self, n: i64) {
        self.scroll_window(self.win, n);
    }

    fn scroll_window(&self, w: Window, n: i64) {
        let top = match w {
            Window::Problem => &self.scroll,
            Window::Tests => &self.tests_top,
        };
        top.set((top.get() as i64 + n).max(0) as usize);
    }

    fn window_at(&self, y: usize) -> Option<Window> {
        let win_y = self.win_y.get();
        WINDOWS.into_iter().find(|&w| {
            let (a, b) = win_y[w as usize];
            y >= a && y < b
        })
    }

    fn toggle_pane(&mut self, sh: &mut Shared, p: Pane) {
        self.win = Window::Problem;
        self.scroll.set(0);
        if self.pane == p {
            self.pane = Pane::Prompt;
            return;
        }
        self.pane = p;
        match p {
            Pane::Solution => match fs::read_to_string(self.p.solution_path()) {
                Err(e) => self.pane_text = e.to_string(),
                Ok(text) => {
                    self.pane_text = text;
                    if !self.peeked {
                        self.peeked = true;
                        self.record(sh, kind::SOLUTION_PEEKED, BTreeMap::new());
                    }
                }
            },
            Pane::Diff => {
                let Some(previous) = self.previous_version(sh) else {
                    self.pane_text = "no earlier attempt".into();
                    return;
                };
                let path = self.path.clone().unwrap_or_default();
                self.pane_text = match workspace::diff(&previous, &path) {
                    Err(e) => e.to_string(),
                    Ok(d) if d.is_empty() => "no changes since the last snapshot".into(),
                    Ok(d) => d,
                };
            }
            Pane::Prompt => {}
        }
    }

    fn previous_version(&self, sh: &Shared) -> Option<PathBuf> {
        let current = self.path.as_ref().and_then(|p| fs::read(p).ok());
        let snaps = sh.app.workspace.snapshots(&self.p.id).unwrap_or_default();
        snaps
            .into_iter()
            .rev()
            .find(|s| fs::read(s).is_ok_and(|data| current.as_ref().is_none_or(|c| *c != data)))
    }

    // ---- view ----

    fn header(&self, sh: &Shared, w: usize) -> Line<'static> {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let (module, technique) = (&c.module_of(&self.p).title, &c.technique_of(&self.p).title);
        let place = if self.mode == mode::CHECKPOINT {
            format!("{} · ???", module.to_lowercase())
        } else if self.mode == mode::DRILL {
            format!("keep sharp · {}", technique.to_lowercase())
        } else if !self.exam_mode() {
            format!("{module} · {technique}").to_lowercase()
        } else {
            "??? hidden".into()
        };
        let right = vec![
            Span::raw("  "),
            difficulty_badge(th, self.p.difficulty),
            Span::raw("  "),
            Span::styled(place, th.muted),
        ];
        let right_w: usize = right.iter().map(Span::width).sum();
        let title = truncate_str(&self.p.title, w.saturating_sub(6 + right_w).max(8));
        let mut spans = vec![Span::raw("  "), ui::chip(th, &title, Tone::Accent)];
        spans.extend(right);
        ui::truncate(Line::from(spans), w)
    }

    fn timer_tone(&self, sh: &Shared) -> Tone {
        let elapsed = self.elapsed(sh);
        if elapsed > self.target {
            Tone::Fail
        } else if elapsed * 5 >= self.target * 4 {
            Tone::Due
        } else {
            Tone::Muted
        }
    }

    fn elapsed_frac(&self, sh: &Shared) -> f64 {
        let target = self.target.max(SignedDuration::from_secs(1));
        self.elapsed(sh).as_secs_f64() / target.as_secs_f64()
    }

    fn test_dots(&self, sh: &Shared) -> Vec<Span<'static>> {
        let th = &sh.theme;
        self.last
            .tests
            .iter()
            .map(|t| {
                if t.outcome == Outcome::Passed {
                    Span::styled("●", th.pass)
                } else if self.last.not_started {
                    Span::styled("○", th.muted)
                } else {
                    Span::styled("✗", th.fail)
                }
            })
            .collect()
    }

    fn test_status(&self, sh: &Shared) -> Vec<Span<'static>> {
        let th = &sh.theme;
        let res = &self.last;
        let count = format!("{}/{}", res.passed, res.total);
        if self.running {
            vec![
                Span::styled(ui::spinner_frame(self.frame), th.accent),
                Span::raw(" running"),
            ]
        } else if !self.err.is_empty() {
            vec![Span::styled(self.err.clone(), th.fail)]
        } else if !self.ran {
            vec![Span::styled("waiting", th.muted)]
        } else if res.err.is_some() {
            vec![Span::styled("could not run", th.fail)]
        } else if res.timed_out {
            vec![Span::styled("timed out", th.fail)]
        } else if res.not_started {
            vec![Span::raw(count), Span::styled(" · not started", th.muted)]
        } else {
            vec![Span::raw(count)]
        }
    }

    fn checkbox(&self, sh: &Shared, i: usize) -> Span<'static> {
        if self.checked[i] {
            Span::styled("[x]", sh.theme.pass)
        } else {
            Span::styled("[ ]", sh.theme.muted)
        }
    }

    fn sidebar(&self, sh: &Shared, width: usize, height: usize) -> Lines {
        let th = &sh.theme;
        let inner = width.saturating_sub(4);
        let tone = self.timer_tone(sh);
        let clock = format!("⏱ {} / {}", mmss(self.elapsed(sh)), mmss(self.target));
        let mut body: Lines = vec![
            Line::from(ui::block(th, &clock, inner, tone)),
            ui::bar(th, self.elapsed_frac(sh), inner, tone),
            Line::default(),
            self.test_block(sh, inner),
            Line::from(self.test_dots(sh)),
            Line::default(),
            Line::from(Span::styled("say it aloud", th.muted)),
        ];
        for (i, item) in self.p.say_aloud.iter().enumerate() {
            body.push(Line::from(vec![
                self.checkbox(sh, i),
                Span::raw(format!(" {item}")),
            ]));
        }
        let n = height.saturating_sub(2);
        body.resize(n, Line::default());
        ui::card(th, "timer", body, width, false)
    }

    fn test_block(&self, sh: &Shared, width: usize) -> Line<'static> {
        let th = &sh.theme;
        let res = &self.last;
        if self.running || !self.err.is_empty() || !self.ran {
            let mut spans = vec![Span::styled("tests ", th.muted)];
            spans.extend(self.test_status(sh));
            return Line::from(spans);
        }
        let (text, tone) = if res.err.is_some() || res.timed_out {
            let status: String = self
                .test_status(sh)
                .iter()
                .map(|s| s.content.as_ref())
                .collect();
            (format!("✗ {status}"), Tone::Fail)
        } else if res.not_started {
            (
                format!("{}/{} · not started", res.passed, res.total),
                Tone::Muted,
            )
        } else if res.green() {
            (format!("✓ {}/{} passed", res.passed, res.total), Tone::Pass)
        } else {
            (format!("✗ {}/{} passed", res.passed, res.total), Tone::Fail)
        };
        Line::from(ui::block(th, &text, width, tone))
    }

    fn checklist_lines(&self, sh: &Shared, width: usize) -> Lines {
        let th = &sh.theme;
        let mut lines: Lines = vec![Line::from(Span::styled("say it aloud ", th.muted))];
        let mut fresh = true;
        for (i, item) in self.p.say_aloud.iter().enumerate() {
            let cell = vec![self.checkbox(sh, i), Span::raw(format!(" {item}"))];
            let cell_w: usize = cell.iter().map(Span::width).sum();
            let last = lines.last_mut().expect("lines starts non-empty");
            if fresh {
                last.spans.push(Span::raw(" "));
                last.spans.extend(cell);
                fresh = false;
            } else if last.width() + 3 + cell_w <= width {
                last.spans.push(Span::styled(" · ", th.border));
                last.spans.extend(cell);
            } else {
                lines.push(Line::from(cell));
            }
        }
        lines.into_iter().map(|l| ui::truncate(l, width)).collect()
    }

    fn banner_card(&self, sh: &Shared, width: usize) -> Lines {
        if self.banner.is_empty() {
            return Vec::new();
        }
        let (title, body) = self
            .banner
            .split_once(" · ")
            .unwrap_or((self.banner.as_str(), ""));
        let body = body.to_string();
        if self.time_up {
            ui::card_tone(&sh.theme, &format!("✗ {title}"), body, width, Tone::Fail)
        } else {
            ui::card_tone(&sh.theme, &format!("✓ {title}"), body, width, Tone::Pass)
        }
    }

    fn pane_lines(&self, sh: &Shared, w: usize) -> Lines {
        let th = &sh.theme;
        let text_lines = || self.pane_text.trim_end_matches('\n').split('\n');
        match self.pane {
            Pane::Solution => return text_lines().map(|l| Line::from(l.to_string())).collect(),
            Pane::Diff => {
                return text_lines()
                    .map(|l| {
                        let style = if l.starts_with('+') && !l.starts_with("+++") {
                            th.pass
                        } else if l.starts_with('-') && !l.starts_with("---") {
                            th.fail
                        } else {
                            Style::default()
                        };
                        Line::from(Span::styled(l.to_string(), style))
                    })
                    .collect();
            }
            Pane::Prompt => {}
        }
        let mut md = self.statement.clone();
        if md.is_empty() {
            match self.stmt_state {
                None => md.push_str("_fetching statement…_\n\n"),
                Some(prompt::Status::Premium) => md.push_str(
                    "_This problem is premium on LeetCode, so its statement is not public. Press o to open it._\n\n",
                ),
                Some(prompt::Status::Offline) => md.push_str(
                    "_Offline: couldn't reach LeetCode for the statement. Press o to open it in the browser._\n\n",
                ),
                Some(_) => {}
            }
            if !self.p.url.is_empty() {
                md.push_str(&format!(
                    "Press **o** to open the problem page:\n\n{}\n",
                    self.p.url
                ));
            }
        }
        let mut lines = render_markdown(th, &md, w);
        for (i, hint) in self.hint_list().iter().take(self.hints).enumerate() {
            lines.push(Line::default());
            lines.push(Line::from(vec![
                Span::styled(format!("hint {}: ", i + 1), th.due),
                Span::raw(hint.clone()),
            ]));
        }
        lines
    }

    fn test_lines(&self, sh: &Shared, width: usize) -> Lines {
        let th = &sh.theme;
        let res = &self.last;
        let mut out: Lines = Vec::new();
        let add = |out: &mut Lines, style: Style, s: &str, indent: usize| {
            for l in wrap_indent(s, indent, width) {
                out.push(Line::from(Span::styled(l, style)));
            }
        };
        if !self.err.is_empty() {
            add(&mut out, th.fail, &self.err, 0);
            return out;
        }
        if !self.ran && self.running {
            return vec![Line::from(vec![
                Span::styled(ui::spinner_frame(self.frame), th.accent),
                Span::raw(" running tests…"),
            ])];
        }
        if !self.ran {
            return vec![Line::from(Span::styled(
                "waiting for the first run",
                th.muted,
            ))];
        }
        if let Some(e) = &res.err {
            add(&mut out, th.fail, &format!("tests could not run: {e}"), 0);
            if !res.output.is_empty() {
                out.push(Line::default());
                add(&mut out, th.muted, &res.output, 0);
            }
            return out;
        }
        if res.timed_out {
            let limit = godur::format_secs(
                SignedDuration::try_from(sh.app.config.timeout).unwrap_or_default(),
            );
            add(
                &mut out,
                th.fail,
                &format!("timed out: the run took longer than {limit}"),
                0,
            );
            if !res.output.is_empty() {
                out.push(Line::default());
                add(&mut out, th.muted, &res.output, 0);
            }
            return out;
        }
        if res.not_started {
            add(&mut out, th.muted, "not started · press e to code", 0);
            for t in &res.tests {
                let label = format!("○ {}", test_label(&self.fn_name, &t.name));
                add(&mut out, Style::default(), &label, 0);
            }
            return out;
        }
        let label_w = width.saturating_sub(2).max(1);
        for t in res.tests.iter().filter(|t| t.outcome != Outcome::Passed) {
            let (glyph, style) = if t.outcome == Outcome::Skipped {
                ("– ", th.muted)
            } else {
                ("✗ ", th.fail)
            };
            let mut line = vec![Span::styled(glyph, style)];
            line.extend(
                ui::truncate(Line::from(test_label(&self.fn_name, &t.name)), label_w).spans,
            );
            out.push(Line::from(line));
            let mut msg = t.message.clone();
            if t.outcome == Outcome::Errored || msg == "collection failure" {
                let detail = last_error_line(&t.detail);
                if !detail.is_empty() {
                    msg = detail
                        .strip_prefix('E')
                        .unwrap_or(&detail)
                        .trim()
                        .to_string();
                }
            }
            if !msg.is_empty() {
                add(&mut out, style, &msg, 2);
            }
            let d = t.detail.trim();
            if !d.is_empty() && d != msg {
                add(&mut out, th.muted, d, 4);
            }
            out.push(Line::default());
        }
        for t in res.tests.iter().filter(|t| t.outcome == Outcome::Passed) {
            let mut line = vec![Span::styled("✓ ", th.pass)];
            line.extend(
                ui::truncate(Line::from(test_label(&self.fn_name, &t.name)), label_w).spans,
            );
            out.push(Line::from(line));
        }
        if res.total == 0 && !res.output.is_empty() {
            add(&mut out, th.fail, "tests could not run", 0);
            add(&mut out, th.muted, &res.output, 0);
        }
        while out.last().is_some_and(|l| ui::plain(l).is_empty()) {
            out.pop();
        }
        out
    }

    #[allow(clippy::too_many_arguments)]
    fn scrolled_card(
        &self,
        sh: &Shared,
        title: &str,
        lines: Lines,
        top: &Cell<usize>,
        width: usize,
        height: usize,
        w: Window,
    ) -> Lines {
        let rows = height.saturating_sub(2).max(1);
        let mut all_rows = self.rows.get();
        all_rows[w as usize] = rows;
        self.rows.set(all_rows);
        self.shown.borrow_mut()[w as usize] = lines.iter().map(ui::plain).collect();
        top.set(top.get().min(lines.len().saturating_sub(rows)));
        let t = top.get();
        let mut title = title.to_string();
        if lines.len() > rows {
            title += &format!(
                " · {}-{}/{}",
                t + 1,
                (t + rows).min(lines.len()),
                lines.len()
            );
        }
        let mut body: Lines = lines.into_iter().skip(t).take(rows).collect();
        body.resize(rows, Line::default());
        ui::card(&sh.theme, &title, body, width, self.win == w)
    }

    fn statement_card(&self, sh: &Shared, width: usize, height: usize) -> Lines {
        let title = match self.pane {
            Pane::Prompt => "problem",
            Pane::Solution => "reference solution",
            Pane::Diff => "diff vs last version",
        };
        let lines = self.pane_lines(sh, width.saturating_sub(4).max(10));
        self.scrolled_card(
            sh,
            title,
            lines,
            &self.scroll,
            width,
            height,
            Window::Problem,
        )
    }

    fn failing(&self) -> bool {
        let res = &self.last;
        if !self.err.is_empty() {
            return true;
        }
        if !self.ran || res.not_started {
            return false;
        }
        if res.err.is_some() || res.timed_out {
            return true;
        }
        !res.green()
    }

    fn tests_card(&self, sh: &Shared, lines: Lines, width: usize, height: usize) -> Lines {
        let res = &self.last;
        let title = if self.ran
            && self.err.is_empty()
            && res.err.is_none()
            && !res.timed_out
            && res.total > 0
        {
            format!("tests · {}/{} passed", res.passed, res.total)
        } else {
            "tests".into()
        };
        self.scrolled_card(
            sh,
            &title,
            lines,
            &self.tests_top,
            width,
            height,
            Window::Tests,
        )
    }

    fn paused_view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let body: Lines = vec![
            Line::from(vec![
                Span::styled(
                    format!("{} / {}", mmss(self.elapsed(sh)), mmss(self.target)),
                    th.title,
                ),
                Span::styled(" · clock stopped", th.muted),
            ]),
            Line::default(),
            Line::from(
                "The problem is hidden while paused, and saves rerun tests when you resume.",
            ),
            Line::default(),
            Line::from(vec![
                Span::styled("p", th.accent),
                Span::raw(" resume    "),
                Span::styled("R", th.accent),
                Span::raw(" restart timer    "),
                Span::styled("esc", th.accent),
                Span::raw(" back"),
            ]),
        ];
        let mut out = vec![Line::default(), self.header(sh, w), Line::default()];
        out.extend(ui::modal(th, "paused", body, w, h.saturating_sub(3).max(1)));
        out
    }

    fn confirm_view(
        &self,
        sh: &Shared,
        title: &str,
        text: &str,
        yes: &str,
        w: usize,
        h: usize,
    ) -> Lines {
        let th = &sh.theme;
        let body: Lines = vec![
            Line::from(text.to_string()),
            Line::default(),
            Line::from(vec![
                Span::styled("y", th.accent),
                Span::raw(format!(" {yes}    ")),
                Span::styled("n", th.accent),
                Span::raw(" cancel"),
            ]),
        ];
        ui::modal(th, title, body, w, h)
    }
}

impl Screen for Focus {
    fn title(&self) -> String {
        match self.mode {
            mode::INTERVIEW => "timed".into(),
            mode::PLACEMENT => "placement".into(),
            mode::CHECKPOINT => "check-in".into(),
            mode::DRILL => "drill".into(),
            _ => self.p.title.clone(),
        }
    }

    fn kind(&self) -> Kind {
        Kind::Focus
    }

    fn init(&mut self, sh: &mut Shared) -> Cmd {
        self.start = (sh.app.now)();
        let path = match sh.app.workspace.ensure(&self.p) {
            Ok(p) => p,
            Err(e) => {
                self.err = e.to_string();
                return Cmd::None;
            }
        };
        if self.should_start_cold(sh, &path) {
            if self.edited(sh) {
                self.snapshot(sh);
            }
            if let Err(e) = sh.app.workspace.reset(&self.p) {
                self.err = e.to_string();
            }
        }
        self.baseline = fs::read(&path).unwrap_or_default();
        self.fn_name = solved_name(&self.p.starter_path());
        self.path = Some(path.clone());
        self.record(sh, kind::OPENED, BTreeMap::new());
        self.report(sh);
        self.run(sh, false);
        self.fetch_prompt(sh);
        self.watch(sh, &path);
        Cmd::None
    }

    /// Interview rounds record their own outcomes, so close only records "left" in practice.
    fn close(&mut self, sh: &mut Shared) {
        if self.closed {
            return;
        }
        self.closed = true;
        self.watcher = None;
        if self.path.is_some() && self.edited(sh) {
            self.snapshot(sh);
        }
        if self.practice_like() && !self.gave_up && !self.passed && self.path.is_some() {
            self.record(sh, kind::LEFT, BTreeMap::new());
        }
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        self.expire(sh);
        match msg {
            Msg::Custom(m) => {
                if let Some(m) = m.downcast_ref::<RunDone>() {
                    // A stale result: a newer run is in flight.
                    if m.focus == self.id && !self.closed && m.seq == self.seq {
                        self.finish_run(sh, m.res.clone(), m.logged);
                    }
                } else if let Some(m) = m.downcast_ref::<FileChanged>() {
                    // Resuming reruns, so a paused save cannot pass.
                    if m.focus == self.id && !self.closed && !self.paused() && !self.time_up {
                        self.run(sh, true);
                    }
                } else if let Some(m) = m.downcast_ref::<EditorDone>() {
                    if m.focus == self.id && !self.closed {
                        if let Some(e) = &m.err {
                            self.err = format!("editor: {e}");
                        }
                        if !self.paused() && !self.time_up {
                            self.run(sh, true);
                        }
                    }
                } else if let Some(m) = m.downcast_ref::<PromptDone>() {
                    if m.focus == self.id {
                        self.statement = m.res.markdown.clone();
                        self.stmt_state = Some(m.res.status);
                    }
                } else if let Some(m) = m.downcast_ref::<Spin>()
                    && m.focus == self.id
                    && !self.closed
                {
                    self.frame += 1;
                    if self.running {
                        self.spin(sh);
                    }
                }
                Cmd::None
            }
            Msg::Key(k) => self.handle_key(sh, &k.name),
            Msg::Mouse(m) => {
                if let Some(w) = self.window_at(m.row.into()) {
                    match m.kind {
                        MouseEventKind::ScrollUp => self.scroll_window(w, -3),
                        MouseEventKind::ScrollDown => self.scroll_window(w, 3),
                        MouseEventKind::Down(MouseButton::Left) => self.win = w,
                        _ => {}
                    }
                }
                Cmd::None
            }
            _ => Cmd::None,
        }
    }

    fn wants_mouse(&self) -> bool {
        !self.confirm
    }

    /// While a confirm prompt is open, q must answer it rather than quit.
    fn owns_key(&self, _key: &str) -> bool {
        self.confirm || self.confirm_restart
    }

    fn keys(&self) -> Vec<Key> {
        if self.confirm || self.confirm_restart {
            return vec![Key::new("y", "yes"), Key::new("n", "cancel")];
        }
        if self.paused() {
            return vec![
                Key::new("p", "resume"),
                Key::new("R", "restart timer"),
                Key::new("esc", "back"),
            ];
        }
        if self.time_up {
            let mut keys = Vec::new();
            if self.p.has_solution {
                keys.push(Key::new("s", "solution"));
            }
            keys.push(Key::new("d", "diff"));
            if !self.p.url.is_empty() {
                keys.push(Key::new("o", "leetcode"));
            }
            keys.push(Key::new("esc", "back"));
            return keys;
        }
        let mut keys = vec![Key::new("e", "edit"), Key::new("space", "rerun")];
        if self.can_pause() {
            keys.push(Key::new("p", "pause"));
        }
        let hints = self.hint_list().len();
        if self.hints < hints {
            keys.push(Key::new("t", format!("hint {}/{hints}", self.hints + 1)));
        }
        if self.p.solution_path().exists() {
            keys.push(Key::new("s", "solution"));
        }
        keys.push(Key::new("esc", "back"));
        keys
    }

    fn help(&self) -> Lines {
        [
            "e      edit in $EDITOR (tests rerun on save)",
            "space  rerun tests",
            "t      reveal next hint",
            "s      show reference solution",
            "d      diff against your last attempt",
            "o      open problem page",
            "r      reset attempt to starter",
            "p      pause / resume the clock (practice; hides the problem)",
            "R      restart the clock (practice; the pass will not count as clean)",
            "1-3    tick say-it-out-loud items",
            "g      give up",
            "       at the time target the attempt ends and counts as a miss (practice)",
            "tab/w  switch between problem and tests",
            "↑/↓    scroll the focused window",
            "pgup/pgdn  page · home/end  top/bottom",
            "z      zoom the focused window",
            "y      copy the focused window",
            "mouse  wheel scrolls, click focuses a window",
            "esc    unzoom, close a pane, or back",
        ]
        .into_iter()
        .map(Line::from)
        .collect()
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        if self.confirm_restart {
            return self.confirm_view(
                sh,
                "restart timer",
                "Set the clock back to 00:00? A pass after a restart will not count as clean, so this problem comes back for review in 1 day.",
                "restart",
                w,
                h,
            );
        }
        if self.paused() {
            return self.paused_view(sh, w, h);
        }
        if self.confirm {
            return self.confirm_view(
                sh,
                "reset",
                "Reset to the starter? Your current code is kept as a snapshot.",
                "reset",
                w,
                h,
            );
        }
        let mut lines: Lines = vec![Line::default(), self.header(sh, w), Line::default()];
        let inner = w.saturating_sub(4);
        let wide = w >= ui::WIDE_MIN;
        lines.extend(indent(self.banner_card(sh, inner), 2));
        let mut strip: Lines = Vec::new();
        if !wide {
            let tone = self.timer_tone(sh);
            let mut spans = vec![
                Span::raw("  "),
                ui::chip(th, &format!("⏱ {}", mmss(self.elapsed(sh))), tone),
                Span::raw(" "),
            ];
            spans.extend(ui::bar(th, self.elapsed_frac(sh), 12, tone).spans);
            spans.push(Span::styled(" · ", th.muted));
            spans.push(Span::raw("tests "));
            spans.extend(self.test_dots(sh));
            spans.push(Span::raw(" "));
            spans.extend(self.test_status(sh));
            strip.push(ui::truncate(Line::from(spans), w));
            strip.extend(indent(
                self.checklist_lines(sh, w.saturating_sub(2).max(1)),
                2,
            ));
        }
        let space = h.saturating_sub(lines.len() + strip.len()).max(3);

        let tests = self.test_lines(sh, inner.saturating_sub(4).max(1));
        let solo = self.zoom || space < 8;
        let (test_h, prob_h) = if solo && self.win == Window::Tests {
            (space, 0)
        } else if solo {
            (0, space)
        } else {
            let limit = if self.win == Window::Tests {
                space * 2 / 3
            } else if !self.failing() && tests.len() + 2 > space / 2 {
                (space / 4).max(3)
            } else {
                space / 2
            };
            let test_h = (tests.len() + 2).min(limit).max(3);
            (test_h, space.saturating_sub(test_h))
        };

        let mut win_y = [(0, 0); 2];
        if prob_h > 0 {
            win_y[0] = (lines.len(), lines.len() + prob_h);
            if wide {
                let stmt_w = inner.saturating_sub(SIDEBAR_WIDTH + 2);
                let cols = ui::columns(
                    2,
                    vec![
                        self.statement_card(sh, stmt_w, prob_h),
                        self.sidebar(sh, SIDEBAR_WIDTH, prob_h),
                    ],
                );
                lines.extend(indent(cols, 2));
            } else {
                lines.extend(indent(self.statement_card(sh, inner, prob_h), 2));
            }
        }
        lines.extend(strip);
        if test_h > 0 {
            win_y[1] = (lines.len(), lines.len() + test_h);
            lines.extend(indent(self.tests_card(sh, tests, inner, test_h), 2));
        }
        self.win_y.set(win_y);
        lines
    }
}

fn other(w: Window) -> Window {
    match w {
        Window::Problem => Window::Tests,
        Window::Tests => Window::Problem,
    }
}

fn record(sh: &mut Shared, e: Event) {
    if let Err(err) = sh.app.record(e) {
        sh.status = format!("could not save progress: {err}");
    }
}

fn data(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
}

fn truncate_str(s: &str, width: usize) -> String {
    ui::plain(&ui::truncate(Line::from(s.to_string()), width))
}

fn wrap_indent(s: &str, indent: usize, width: usize) -> Vec<String> {
    let pad = " ".repeat(indent);
    s.trim_end_matches('\n')
        .split('\n')
        .flat_map(|line| {
            ui::wrap_lines(
                Line::from(line.to_string()),
                width.saturating_sub(indent).max(1),
            )
        })
        .map(|part| format!("{pad}{}", ui::plain(&part)))
        .collect()
}

fn last_error_line(out: &str) -> String {
    let out = out.trim();
    if out.is_empty() {
        return String::new();
    }
    let lines: Vec<&str> = out.split('\n').collect();
    lines
        .iter()
        .rev()
        .find(|l| l.contains("Error"))
        .map_or(lines[lines.len() - 1], |l| l.trim())
        .to_string()
}

/// The starter's last top-level def or class; support classes come first.
fn solved_name(starter: &Path) -> String {
    let Ok(text) = fs::read_to_string(starter) else {
        return String::new();
    };
    text.lines()
        .rev()
        .filter_map(|l| l.strip_prefix("def ").or_else(|| l.strip_prefix("class ")))
        .filter_map(|rest| {
            let name: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            (!name.is_empty()).then_some(name)
        })
        .next()
        .unwrap_or_default()
}

fn test_label(func: &str, test: &str) -> String {
    let mut name = test.strip_prefix("test_").unwrap_or(test);
    let prefix = func.to_lowercase();
    if !prefix.is_empty() && name != prefix {
        name = name.strip_prefix(&format!("{prefix}_")).unwrap_or(name);
    }
    name.replace('_', " ")
}

#[cfg(test)]
mod tests;
