use std::any::Any;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use std::sync::mpsc::{self, Receiver, Sender};
use std::time::{Duration, Instant};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseEvent, MouseEventKind};
use ratatui::Frame;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

use super::screens;
use super::theme::Theme;
use super::ui::{self, Key, Lines};
use super::widgets::TAB_BAR_HEIGHT;
use crate::catalog::Problem;
use crate::prompt::PromptResult;
use crate::runner::RunResult;

pub const TAB_NAMES: [&str; 5] = ["today", "map", "timed", "playlists", "stats"];

const TOAST_LIFE: Duration = Duration::from_secs(2);

/// A key press with its name (`enter`, `ctrl+k`, `shift+tab`, `space`, `a`), which screens match on.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KeyPress {
    pub name: String,
    pub event: KeyEvent,
}

impl KeyPress {
    pub fn new(event: KeyEvent) -> KeyPress {
        KeyPress {
            name: key_name(&event),
            event,
        }
    }

    pub fn named(name: &str) -> KeyPress {
        let mut mods = KeyModifiers::NONE;
        let mut rest = name;
        loop {
            if let Some(r) = rest.strip_prefix("ctrl+") {
                mods |= KeyModifiers::CONTROL;
                rest = r;
            } else if let Some(r) = rest.strip_prefix("alt+") {
                mods |= KeyModifiers::ALT;
                rest = r;
            } else if let Some(r) = rest.strip_prefix("shift+") {
                mods |= KeyModifiers::SHIFT;
                rest = r;
            } else {
                break;
            }
        }
        let code = match rest {
            "enter" => KeyCode::Enter,
            "esc" => KeyCode::Esc,
            "tab" if mods.contains(KeyModifiers::SHIFT) => KeyCode::BackTab,
            "tab" => KeyCode::Tab,
            "backspace" => KeyCode::Backspace,
            "delete" => KeyCode::Delete,
            "insert" => KeyCode::Insert,
            "up" => KeyCode::Up,
            "down" => KeyCode::Down,
            "left" => KeyCode::Left,
            "right" => KeyCode::Right,
            "home" => KeyCode::Home,
            "end" => KeyCode::End,
            "pgup" => KeyCode::PageUp,
            "pgdown" => KeyCode::PageDown,
            "space" => KeyCode::Char(' '),
            f if f.len() > 1 && f.starts_with('f') && f[1..].parse::<u8>().is_ok() => {
                KeyCode::F(f[1..].parse().unwrap_or(1))
            }
            s => KeyCode::Char(s.chars().next().unwrap_or(' ')),
        };
        KeyPress::new(KeyEvent::new(code, mods))
    }

    pub fn text(&self) -> Option<char> {
        match self.event.code {
            KeyCode::Char(c)
                if !self
                    .event
                    .modifiers
                    .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT) =>
            {
                Some(c)
            }
            _ => None,
        }
    }
}

fn key_name(ev: &KeyEvent) -> String {
    let m = ev.modifiers;
    let mut prefix = String::new();
    if m.contains(KeyModifiers::CONTROL) {
        prefix.push_str("ctrl+");
    }
    if m.contains(KeyModifiers::ALT) {
        prefix.push_str("alt+");
    }
    let base = match ev.code {
        KeyCode::Char(' ') => "space".to_string(),
        // Shift is already in the character ('A', '?').
        KeyCode::Char(c) => return format!("{prefix}{c}"),
        KeyCode::BackTab => return format!("{prefix}shift+tab"),
        KeyCode::Enter => "enter".into(),
        KeyCode::Esc => "esc".into(),
        KeyCode::Tab => "tab".into(),
        KeyCode::Backspace => "backspace".into(),
        KeyCode::Delete => "delete".into(),
        KeyCode::Insert => "insert".into(),
        KeyCode::Up => "up".into(),
        KeyCode::Down => "down".into(),
        KeyCode::Left => "left".into(),
        KeyCode::Right => "right".into(),
        KeyCode::Home => "home".into(),
        KeyCode::End => "end".into(),
        KeyCode::PageUp => "pgup".into(),
        KeyCode::PageDown => "pgdown".into(),
        KeyCode::F(n) => format!("f{n}"),
        other => format!("{other:?}").to_lowercase(),
    };
    if m.contains(KeyModifiers::SHIFT) {
        prefix.push_str("shift+");
    }
    format!("{prefix}{base}")
}

/// Everything a screen can receive. Keys go to the top screen; every other
/// message reaches every screen, and each ignores what is not addressed to it.
pub enum Msg {
    Key(KeyPress),
    /// Row is already relative to the screen body (the tab bar is subtracted).
    Mouse(MouseEvent),
    /// Once a second, for clocks.
    Tick,
    ToastExpired(u64),
    /// A screen's own message (a finished test run, a timer), sent through
    /// `Shared::after` or `Shared::sender` and recovered with `downcast_ref`.
    Custom(Box<dyn Any + Send>),
}

pub type ExecDone = Box<dyn FnOnce(Result<(), String>) -> Msg + Send>;

#[derive(Default)]
pub enum Cmd {
    #[default]
    None,
    Push(Box<dyn Screen>),
    /// Leaves the top screen (and an open problem under it) for this one.
    Jump(Box<dyn Screen>),
    Pop,
    Tab(usize),
    Quit,
    Batch(Vec<Cmd>),
    /// Suspends the terminal, runs the command (an editor), resumes, then delivers done.
    Exec(Command, ExecDone),
    /// Puts text on the system clipboard (OSC 52).
    Copy(String),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Home,
    Focus,
    Search,
    Other,
}

pub trait Screen {
    /// Shown in the window title and the help modal.
    fn title(&self) -> String;
    /// Exactly the body area; longer or wider output is cut by the frame.
    fn view(&self, sh: &Shared, width: usize, height: usize) -> Lines;
    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd;

    /// The tab this screen belongs to; the tab bar shows the nearest one down the stack.
    fn tab(&self) -> Option<usize> {
        None
    }
    fn kind(&self) -> Kind {
        Kind::Other
    }
    fn keys(&self) -> Vec<Key> {
        Vec::new()
    }
    /// Screen-specific lines above the global keys in the help modal.
    fn help(&self) -> Lines {
        Vec::new()
    }
    /// True for keys the screen handles itself before the app's globals.
    fn owns_key(&self, _key: &str) -> bool {
        false
    }
    /// Screens with their own list filter take `/`; they do not offer search.
    fn filters(&self) -> bool {
        false
    }
    /// Starts the filter; false falls back to opening search.
    fn start_filter(&mut self) -> bool {
        false
    }
    fn wants_mouse(&self) -> bool {
        false
    }
    fn init(&mut self, _sh: &mut Shared) -> Cmd {
        Cmd::None
    }
    fn close(&mut self, _sh: &mut Shared) {}
}

/// Runs one problem's tests; swapped for a fake in tests.
pub trait TestRunner: Send + Sync {
    fn run(&self, test_file: &Path, code_file: &Path) -> RunResult;
}

impl TestRunner for crate::runner::Runner {
    fn run(&self, test_file: &Path, code_file: &Path) -> RunResult {
        crate::runner::Runner::run(self, test_file, code_file)
    }
}

/// Finds a problem's statement; swapped for a fake in tests.
pub trait PromptSource: Send + Sync {
    fn get(&self, p: &Problem) -> PromptResult;
}

impl PromptSource for crate::prompt::Source {
    fn get(&self, p: &Problem) -> PromptResult {
        crate::prompt::Source::get(self, p)
    }
}

pub type OpenFn = Box<dyn Fn(&str) -> Result<(), String>>;

pub type WatchFn = fn(&Path, Duration) -> notify::Result<crate::watch::FileWatch>;

pub struct Shared {
    pub theme: Theme,
    pub app: crate::app::App,
    /// An error that stays on screen until restart (e.g. a failed save).
    pub status: String,
    pub runner: Arc<dyn TestRunner>,
    pub prompts: Arc<dyn PromptSource>,
    /// None turns off rerun-on-save.
    pub watch: Option<WatchFn>,
    pub open: OpenFn,
    /// Tests run background jobs inline so their messages are queued deterministically.
    pub(crate) inline_jobs: bool,
    toast: String,
    toast_id: u64,
    timers: Vec<(Instant, Msg)>,
    tx: Sender<Msg>,
    rx: Receiver<Msg>,
}

#[cfg(test)]
pub(crate) fn test_shared() -> Shared {
    let dir = tempfile::tempdir().expect("temp dir").keep();
    let (log, events, _) = crate::progress::Log::open(&dir.join("events.jsonl"));
    let workspace = crate::workspace::Workspace {
        dir: dir.join("work"),
    };
    let mut sh = Shared::new(crate::app::App::new(
        crate::testutil::good_catalog(),
        log,
        events,
        workspace,
    ));
    // No network, no python, no watcher, no browser.
    sh.runner = Arc::new(FakeRunner::default());
    sh.prompts = Arc::new(FakePrompts::default());
    sh.watch = None;
    sh.open = Box::new(|_| Ok(()));
    sh.inline_jobs = true;
    sh
}

/// Returns its results in order, repeating the last; a default result when empty.
#[cfg(test)]
#[derive(Default)]
pub(crate) struct FakeRunner {
    pub results: Vec<RunResult>,
    pub calls: std::sync::atomic::AtomicUsize,
}

#[cfg(test)]
impl TestRunner for FakeRunner {
    fn run(&self, _test: &Path, _code: &Path) -> RunResult {
        let n = self.calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        match self.results.len() {
            0 => RunResult::default(),
            len => self.results[n.min(len - 1)].clone(),
        }
    }
}

#[cfg(test)]
pub(crate) struct FakePrompts {
    pub md: String,
    pub status: crate::prompt::Status,
}

#[cfg(test)]
impl Default for FakePrompts {
    fn default() -> FakePrompts {
        FakePrompts {
            md: String::new(),
            status: crate::prompt::Status::NoSource,
        }
    }
}

#[cfg(test)]
impl PromptSource for FakePrompts {
    fn get(&self, _p: &Problem) -> PromptResult {
        PromptResult {
            markdown: self.md.clone(),
            status: self.status,
            err: None,
        }
    }
}

impl Shared {
    pub fn new(app: crate::app::App) -> Shared {
        let (tx, rx) = mpsc::channel();
        Shared {
            theme: Theme::new(),
            runner: Arc::new(app.runner.clone()),
            prompts: Arc::new(app.prompts.clone()),
            watch: Some(crate::watch::file),
            open: Box::new(open_url),
            inline_jobs: false,
            app,
            status: String::new(),
            toast: String::new(),
            toast_id: 0,
            timers: Vec::new(),
            tx,
            rx,
        }
    }

    /// Shows text at the right of the key bar for a couple of seconds.
    pub fn toast(&mut self, text: impl Into<String>) {
        self.toast = text.into();
        self.toast_id += 1;
    }

    pub fn toast_text(&self) -> &str {
        &self.toast
    }

    /// Delivers msg to every screen after d.
    pub fn after(&mut self, d: Duration, msg: Msg) {
        self.timers.push((Instant::now() + d, msg));
    }

    /// For background threads: messages sent here reach every screen.
    pub fn sender(&self) -> Sender<Msg> {
        self.tx.clone()
    }

    /// Runs blocking work off the UI thread and delivers its message to every screen.
    pub fn spawn(&self, job: impl FnOnce() -> Msg + Send + 'static) {
        let tx = self.tx.clone();
        if self.inline_jobs {
            let _ = tx.send(job());
            return;
        }
        std::thread::spawn(move || {
            let _ = tx.send(job());
        });
    }

    #[cfg(test)]
    pub(crate) fn queued(&self) -> Vec<Msg> {
        self.rx.try_iter().collect()
    }

    #[cfg(test)]
    pub(crate) fn timer_count(&self) -> usize {
        self.timers.len()
    }
}

/// The OS's browser launcher, detached so the TUI keeps the terminal.
pub fn open_url(url: &str) -> Result<(), String> {
    use std::process::{Command, Stdio};
    let mut cmd = if cfg!(target_os = "macos") {
        Command::new("open")
    } else if cfg!(windows) {
        let mut c = Command::new("rundll32");
        c.arg("url.dll,FileProtocolHandler");
        c
    } else {
        Command::new("xdg-open")
    };
    let mut child = cmd
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("could not open {url}: {e}"))?;
    // Reap the launcher so it does not linger as a zombie.
    std::thread::spawn(move || child.wait());
    Ok(())
}

pub struct App {
    pub sh: Shared,
    stack: Vec<Box<dyn Screen>>,
    width: usize,
    height: usize,
    help: bool,
    seen_toast: u64,
    quit: bool,
    exec: Option<(Command, ExecDone)>,
    clipboard: Option<String>,
}

impl App {
    pub fn new(mut sh: Shared) -> App {
        let root = screens::new_tab(&mut sh, 0);
        let mut app = App {
            sh,
            stack: vec![root],
            width: 80,
            height: 24,
            help: false,
            seen_toast: 0,
            quit: false,
            exec: None,
            clipboard: None,
        };
        let cmd = app.stack[0].init(&mut app.sh);
        app.apply(cmd);
        app
    }

    /// Opens a problem over Today; unknown ids are ignored.
    pub fn open_problem(&mut self, id: &str) {
        if self.sh.app.catalog.problem(id).is_some() {
            let f = screens::new_focus(&mut self.sh, id, crate::progress::mode::PRACTICE);
            self.push(f);
        }
    }

    pub fn take_exec(&mut self) -> Option<(Command, ExecDone)> {
        self.exec.take()
    }

    pub fn take_clipboard(&mut self) -> Option<String> {
        self.clipboard.take()
    }

    pub fn top(&self) -> &dyn Screen {
        self.stack[self.stack.len() - 1].as_ref()
    }

    pub fn depth(&self) -> usize {
        self.stack.len()
    }

    pub fn should_quit(&self) -> bool {
        self.quit
    }

    pub fn resize(&mut self, width: usize, height: usize) {
        self.width = width;
        self.height = height;
    }

    pub fn window_title(&self) -> String {
        format!("myleet · {}", self.top().title())
    }

    pub fn wants_mouse(&self) -> bool {
        !self.help && self.top().wants_mouse()
    }

    pub fn active_tab(&self) -> usize {
        self.stack.iter().rev().find_map(|s| s.tab()).unwrap_or(0)
    }

    pub fn update(&mut self, msg: Msg) {
        let cmd = self.update_msg(msg);
        self.apply(cmd);
        if self.sh.toast_id != self.seen_toast {
            self.seen_toast = self.sh.toast_id;
            self.sh
                .after(TOAST_LIFE, Msg::ToastExpired(self.sh.toast_id));
        }
    }

    pub fn deliver(&mut self, now: Instant) {
        let (due, later) = std::mem::take(&mut self.sh.timers)
            .into_iter()
            .partition(|(at, _)| *at <= now);
        self.sh.timers = later;
        for (_, msg) in due {
            self.update(msg);
        }
        while let Ok(msg) = self.sh.rx.try_recv() {
            self.update(msg);
        }
    }

    pub fn next_timer(&self) -> Option<Instant> {
        self.sh.timers.iter().map(|(at, _)| *at).min()
    }

    fn update_msg(&mut self, msg: Msg) -> Cmd {
        match msg {
            Msg::ToastExpired(id) => {
                if id == self.sh.toast_id {
                    self.sh.toast.clear();
                }
                Cmd::None
            }
            Msg::Key(k) => self.handle_key(k),
            Msg::Mouse(m) => {
                if self.help {
                    return Cmd::None;
                }
                self.forward(&Msg::Mouse(m))
            }
            msg => {
                let cmds = self
                    .stack
                    .iter_mut()
                    .map(|s| s.update(&mut self.sh, &msg))
                    .collect();
                Cmd::Batch(cmds)
            }
        }
    }

    fn forward(&mut self, msg: &Msg) -> Cmd {
        let top = self.stack.len() - 1;
        self.stack[top].update(&mut self.sh, msg)
    }

    fn handle_key(&mut self, k: KeyPress) -> Cmd {
        let name = k.name.as_str();
        if name == "ctrl+c" {
            return Cmd::Quit;
        }
        if self.help {
            self.help = false;
            return Cmd::None;
        }
        if self.top().owns_key(name) {
            return self.forward(&Msg::Key(k));
        }
        let n = TAB_NAMES.len();
        match name {
            "]" => return Cmd::Tab((self.active_tab() + 1) % n),
            "[" => return Cmd::Tab((self.active_tab() + n - 1) % n),
            _ => {}
        }
        if self.stack.len() == 1 {
            match name {
                "1" | "2" | "3" | "4" | "5" => {
                    return Cmd::Tab(name.parse::<usize>().unwrap_or(1) - 1);
                }
                "tab" => return Cmd::Tab((self.active_tab() + 1) % n),
                "shift+tab" => return Cmd::Tab((self.active_tab() + n - 1) % n),
                _ => {}
            }
        }
        match name {
            "?" => {
                self.help = true;
                return Cmd::None;
            }
            "q" => return Cmd::Quit,
            "/" | "ctrl+k" if self.top().kind() != Kind::Search => {
                let top = self.stack.len() - 1;
                if name == "/" && self.stack[top].filters() && self.stack[top].start_filter() {
                    return Cmd::None;
                }
                return Cmd::Push(screens::new_search(&mut self.sh));
            }
            _ => {}
        }
        self.forward(&Msg::Key(k))
    }

    fn apply(&mut self, cmd: Cmd) {
        match cmd {
            Cmd::None => {}
            Cmd::Batch(cmds) => cmds.into_iter().for_each(|c| self.apply(c)),
            Cmd::Quit => {
                self.close_all();
                self.quit = true;
            }
            Cmd::Tab(i) => self.switch_tab(i),
            Cmd::Exec(c, done) => self.exec = Some((c, done)),
            Cmd::Copy(text) => self.clipboard = Some(text),
            Cmd::Push(s) => self.push(s),
            Cmd::Jump(s) => {
                if self.stack.len() > 1 {
                    self.pop_top();
                }
                if self.top().kind() == Kind::Focus && self.stack.len() > 1 {
                    self.pop_top();
                }
                self.push(s);
            }
            Cmd::Pop => {
                if self.stack.len() > 1 {
                    self.pop_top();
                } else if self.top().kind() != Kind::Home {
                    self.switch_tab(0);
                }
            }
        }
    }

    fn push(&mut self, mut s: Box<dyn Screen>) {
        let cmd = s.init(&mut self.sh);
        self.stack.push(s);
        self.apply(cmd);
    }

    fn pop_top(&mut self) {
        if let Some(mut s) = self.stack.pop() {
            s.close(&mut self.sh);
        }
    }

    fn switch_tab(&mut self, i: usize) {
        while self.stack.len() > 1 {
            self.pop_top();
        }
        self.stack[0].close(&mut self.sh);
        let mut root = screens::new_tab(&mut self.sh, i);
        let cmd = root.init(&mut self.sh);
        self.stack[0] = root;
        self.apply(cmd);
    }

    fn close_all(&mut self) {
        for s in self.stack.iter_mut().rev() {
            s.close(&mut self.sh);
        }
    }

    fn offers_search(&self, keys: &[Key]) -> bool {
        let top = self.top();
        top.kind() != Kind::Search
            && !top.filters()
            && !top.owns_key("/")
            && !keys.iter().any(|k| k.key == "/")
    }

    /// The whole frame as exactly height lines of exactly width columns.
    pub fn view(&self) -> Lines {
        let th = &self.sh.theme;
        let (width, height) = (self.width, self.height);
        let top = self.top();
        let mut keys = top.keys();
        if self.offers_search(&keys) {
            keys.push(Key::new("/", "search"));
        }
        if !top.owns_key("]") {
            keys.push(Key::new("[/]", "tabs"));
            if self.stack.len() == 1 && !top.owns_key("1") {
                keys.push(Key::new("1-5", "jump"));
            }
        }
        let toast = if self.sh.toast.is_empty() {
            Line::default()
        } else {
            Line::from(vec![
                Span::styled("● ", th.accent),
                Span::raw(self.sh.toast.clone()),
                Span::raw(" "),
            ])
        };
        let key_rows = if height >= 16 { 2 } else { 1 };
        let key_bar = ui::key_bar_lines(th, &keys, width, toast, key_rows);
        let status_rows = usize::from(!self.sh.status.is_empty());
        let body_h = height.saturating_sub(TAB_BAR_HEIGHT + key_bar.len() + status_rows);
        let body = if self.help {
            self.help_view(width, body_h.max(1))
        } else {
            top.view(&self.sh, width, body_h.max(1))
        };
        let mut lines = ui::tab_bar(th, &TAB_NAMES, self.active_tab(), width);
        let mut body = fit(body, width, body_h);
        body.resize(body_h, Line::default());
        lines.extend(body);
        if status_rows > 0 {
            lines.push(Line::from(vec![
                Span::raw(" "),
                Span::styled(self.sh.status.clone(), th.fail),
            ]));
        }
        lines.extend(key_bar);
        fit(lines, width, height)
    }

    pub fn draw(&self, f: &mut Frame) {
        f.render_widget(Paragraph::new(self.view()), f.area());
    }
}

pub fn fit(mut lines: Lines, width: usize, height: usize) -> Lines {
    lines.truncate(height);
    lines.into_iter().map(|l| ui::truncate(l, width)).collect()
}

/// Moves a mouse event from frame rows to body rows. Clicks on the tab bar
/// have no body row and are dropped.
pub fn shift_mouse(mut m: MouseEvent) -> Option<MouseEvent> {
    let dy = TAB_BAR_HEIGHT as u16;
    if m.row < dy
        && !matches!(
            m.kind,
            MouseEventKind::ScrollUp | MouseEventKind::ScrollDown
        )
    {
        return None;
    }
    m.row = m.row.saturating_sub(dy);
    Some(m)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::Terminal;
    use ratatui::backend::TestBackend;
    use ratatui::style::Modifier;

    struct Probe {
        owns: &'static [&'static str],
        kind: Kind,
        got: Vec<String>,
    }

    impl Screen for Probe {
        fn title(&self) -> String {
            "probe".into()
        }
        fn view(&self, sh: &Shared, width: usize, _h: usize) -> Lines {
            ui::card(&sh.theme, "probe", "probe body", width, false)
        }
        fn update(&mut self, _sh: &mut Shared, msg: &Msg) -> Cmd {
            if let Msg::Key(k) = msg {
                self.got.push(k.name.clone());
                if k.name == "esc" {
                    return Cmd::Pop;
                }
            }
            Cmd::None
        }
        fn owns_key(&self, key: &str) -> bool {
            self.owns.contains(&key)
        }
        fn kind(&self) -> Kind {
            self.kind
        }
    }

    fn probe(owns: &'static [&'static str], kind: Kind) -> Box<dyn Screen> {
        Box::new(Probe {
            owns,
            kind,
            got: Vec::new(),
        })
    }

    fn app() -> App {
        // Past the placement gate, which hides search.
        App::new(crate::tui::home::fixtures::home_shared(Vec::new()))
    }

    fn send(app: &mut App, keys: &[&str]) {
        for k in keys {
            app.update(Msg::Key(KeyPress::named(k)));
        }
    }

    fn rows(app: &mut App, w: u16, h: u16) -> Vec<String> {
        app.resize(w.into(), h.into());
        let mut term = Terminal::new(TestBackend::new(w, h)).unwrap();
        term.draw(|f| app.draw(f)).unwrap();
        let buf = term.backend().buffer().clone();
        (0..h)
            .map(|y| (0..w).map(|x| buf[(x, y)].symbol().to_string()).collect())
            .collect()
    }

    fn bar(rows: &[String]) -> String {
        rows[rows.len() - 2..].join("\n")
    }

    #[test]
    fn frame_has_tab_bar_and_key_bar() {
        for (w, h) in [(80, 24), (120, 32)] {
            let ls = rows(&mut app(), w, h);
            assert_eq!(ls.len(), h as usize);
            assert_eq!(
                ls[0].trim_end(),
                " myleet    today · map · timed · playlists · stats"
            );
            assert!(ls[1].chars().all(|c| c == '─'), "{}", ls[1]);
            assert!(ls[h as usize - 1].contains("? more"), "{}", ls.join("\n"));
            assert!(bar(&ls).contains("/ search") && bar(&ls).contains("1-5 jump"));
        }
    }

    #[test]
    fn active_tab_is_reverse_video() {
        let mut a = app();
        send(&mut a, &["2"]);
        a.resize(80, 24);
        let mut term = Terminal::new(TestBackend::new(80, 24)).unwrap();
        term.draw(|f| a.draw(f)).unwrap();
        let buf = term.backend().buffer();
        let row0: String = (0..80).map(|x| buf[(x, 0)].symbol().to_string()).collect();
        let col = row0.find(" map ").unwrap() as u16 + 1;
        assert!(buf[(col, 0)].modifier.contains(Modifier::REVERSED));
        for y in 0..24 {
            for x in 0..80 {
                assert_eq!(
                    buf[(x, y)].bg,
                    ratatui::style::Color::Reset,
                    "bg at {x},{y}"
                );
            }
        }
    }

    #[test]
    fn number_keys_switch_tabs() {
        let mut a = app();
        send(&mut a, &["2"]);
        assert_eq!((a.active_tab(), a.depth()), (1, 1));
        send(&mut a, &["5"]);
        assert_eq!(a.active_tab(), 4);
        send(&mut a, &["tab"]);
        assert_eq!(
            a.top().kind(),
            Kind::Home,
            "tab from the last tab wraps to today"
        );
        send(&mut a, &["shift+tab"]);
        assert_eq!(a.active_tab(), 4);
        send(&mut a, &["3"]);
        assert!(rows(&mut a, 80, 24)[0].contains("timed"));
        assert_eq!(a.window_title(), "myleet · timed");
    }

    #[test]
    fn owned_digits_do_not_switch_tabs() {
        let mut a = app();
        a.apply(Cmd::Push(probe(&["1", "2", "3", "4", "5"], Kind::Focus)));
        send(&mut a, &["2"]);
        assert_eq!((a.depth(), a.top().title().as_str()), (2, "probe"));
    }

    #[test]
    fn esc_on_root_tab_returns_today() {
        let mut a = app();
        send(&mut a, &["5", "esc"]);
        assert_eq!(a.top().kind(), Kind::Home);
        send(&mut a, &["esc"]);
        assert!(!a.should_quit(), "esc on today must not quit");
        assert_eq!(a.top().kind(), Kind::Home);
    }

    #[test]
    fn toast_expires() {
        let mut a = app();
        a.sh.toast("hello there");
        a.update(Msg::Tick);
        assert!(bar(&rows(&mut a, 80, 24)).contains("hello there"));
        let id = a.sh.toast_id;
        a.update(Msg::ToastExpired(id - 1));
        assert!(
            bar(&rows(&mut a, 80, 24)).contains("hello there"),
            "stale timer"
        );
        a.update(Msg::ToastExpired(id));
        assert!(!rows(&mut a, 80, 24).join("\n").contains("hello there"));
    }

    #[test]
    fn toast_timer_fires_through_deliver() {
        let mut a = app();
        a.sh.toast("soon gone");
        a.update(Msg::Tick);
        let at = a.next_timer().expect("toast timer");
        a.deliver(at);
        assert!(a.sh.toast_text().is_empty());
    }

    #[test]
    fn sticky_status_and_toast() {
        let mut a = app();
        a.sh.status = "could not save progress: disk full".into();
        a.sh.toast("hi");
        let ls = rows(&mut a, 80, 24);
        assert!(
            ls[ls.len() - 2].contains("could not save progress"),
            "{}",
            ls.join("\n")
        );
        assert!(ls[ls.len() - 1].contains("hi"));
    }

    #[test]
    fn help_is_modal() {
        let mut a = app();
        send(&mut a, &["?"]);
        let view = rows(&mut a, 80, 24).join("\n");
        assert!(view.contains("╭─ keys · today"), "{view}");
        send(&mut a, &["2"]);
        assert_eq!(a.active_tab(), 0, "any key closes help first");
        assert!(!rows(&mut a, 80, 24).join("\n").contains("╭─ keys"));
    }

    #[test]
    fn q_and_ctrl_c_quit() {
        let mut a = app();
        send(&mut a, &["q"]);
        assert!(a.should_quit());
        let mut b = app();
        b.apply(Cmd::Push(probe(&["q"], Kind::Other)));
        send(&mut b, &["q"]);
        assert!(!b.should_quit(), "an owned q is the screen's");
        send(&mut b, &["ctrl+c"]);
        assert!(b.should_quit());
    }

    #[test]
    fn brackets_switch_tabs_from_anywhere() {
        let mut a = app();
        send(&mut a, &["]"]);
        assert_eq!(a.active_tab(), 1);
        send(&mut a, &["[", "["]);
        assert_eq!(a.active_tab(), 4, "[ from today wraps to stats");
        let b = bar(&rows(&mut a, 80, 24));
        assert!(b.contains("[/] tabs") && b.contains("1-5 jump"), "{b}");

        let mut f = app();
        f.apply(Cmd::Push(probe(&["1", "2"], Kind::Focus)));
        let b = bar(&rows(&mut f, 80, 24));
        assert!(b.contains("[/] tabs") && !b.contains("1-5 jump"), "{b}");
        send(&mut f, &["]"]);
        assert_eq!((f.depth(), f.active_tab()), (1, 1), "] leaves the problem");
    }

    #[test]
    fn owned_brackets_stay() {
        let mut a = app();
        a.apply(Cmd::Push(probe(&["]", "["], Kind::Other)));
        send(&mut a, &["]"]);
        assert_eq!(a.depth(), 2);
        assert!(!bar(&rows(&mut a, 80, 24)).contains("[/] tabs"));
    }

    #[test]
    fn slash_opens_search_once() {
        let mut a = app();
        send(&mut a, &["/"]);
        assert_eq!((a.depth(), a.top().kind()), (2, Kind::Search));
        send(&mut a, &["ctrl+k"]);
        assert_eq!(a.depth(), 2, "search does not stack");
        assert!(!bar(&rows(&mut a, 80, 24)).contains("/ search"));
        send(&mut a, &["esc"]);
        assert_eq!(a.depth(), 1);
    }

    #[test]
    fn jump_replaces_focus_under_top() {
        let mut a = app();
        a.apply(Cmd::Push(probe(&[], Kind::Focus)));
        a.apply(Cmd::Push(probe(&[], Kind::Other)));
        a.apply(Cmd::Jump(probe(&[], Kind::Search)));
        assert_eq!((a.depth(), a.top().kind()), (2, Kind::Search));
    }

    #[test]
    fn cards_stretch_full_width() {
        for (w, h) in [(80u16, 24u16), (120, 32), (180, 40)] {
            for tab in ["1", "2", "3", "4", "5"] {
                let mut a = app();
                send(&mut a, &[tab]);
                let ls = rows(&mut a, w, h);
                let card = ls.iter().find(|l| l.contains('╭')).expect("card");
                assert_eq!(
                    card.trim_end().chars().count(),
                    w as usize - 2,
                    "tab {tab} at {w}: {card}"
                );
            }
        }
    }

    #[test]
    fn small_terminal_does_not_panic() {
        let mut a = app();
        send(&mut a, &["?"]);
        for (w, h) in [(1, 1), (10, 3), (20, 5), (30, 15)] {
            assert_eq!(rows(&mut a, w, h).len(), h as usize);
        }
        a.sh.status = "x".into();
        assert_eq!(rows(&mut a, 20, 3).len(), 3);
    }

    #[test]
    fn mouse_rows_shift_past_tab_bar() {
        use crossterm::event::MouseButton;
        let ev = |row, kind| MouseEvent {
            kind,
            column: 3,
            row,
            modifiers: KeyModifiers::NONE,
        };
        let down = MouseEventKind::Down(MouseButton::Left);
        assert_eq!(shift_mouse(ev(5, down)).map(|m| m.row), Some(3));
        assert!(shift_mouse(ev(1, down)).is_none());
        assert_eq!(
            shift_mouse(ev(0, MouseEventKind::ScrollDown)).map(|m| m.row),
            Some(0)
        );
    }

    #[test]
    fn key_names_match_bubble_tea() {
        for name in [
            "enter",
            "esc",
            "tab",
            "shift+tab",
            "ctrl+k",
            "ctrl+c",
            "space",
            "up",
            "?",
            "A",
            "]",
            "f5",
            "pgdown",
        ] {
            assert_eq!(KeyPress::named(name).name, name);
        }
        assert_eq!(KeyPress::named("a").text(), Some('a'));
        assert_eq!(KeyPress::named("ctrl+a").text(), None);
    }
}
