//! The interactive trainer, drawn with ratatui on crossterm.

pub mod app;
#[cfg(test)]
mod browse_testing;
pub mod filter;
mod focus;
mod help;
pub mod home;
mod interview;
pub mod mapscreen;
pub mod markdown;
pub mod placement;
pub mod playlists;
pub mod screens;
pub mod search;
pub mod settings;
pub mod theme;
pub mod ui;
pub mod widgets;

use std::io::{self, stdout};
use std::time::{Duration, Instant};

use crossterm::clipboard::CopyToClipboard;
use crossterm::event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyEventKind};
use crossterm::execute;
use crossterm::terminal::{self as term, SetTitle};
use ratatui::DefaultTerminal;

pub use app::{App, Cmd, KeyPress, Kind, Msg, Screen, Shared};

const TICK: Duration = Duration::from_secs(1);

/// Runs the trainer until the user quits, with problem `open` (an id) on top
/// of Today when given. The terminal is restored on return and on panic
/// (ratatui's hook, plus mouse capture which it does not undo).
pub fn run(sh: Shared, open: Option<&str>) -> io::Result<()> {
    let prev = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = execute!(stdout(), DisableMouseCapture);
        prev(info);
    }));
    let mut terminal = ratatui::try_init()?;
    let mut app = App::new(sh);
    if let Some(id) = open {
        app.open_problem(id);
    }
    let result = event_loop(&mut terminal, app);
    let _ = execute!(stdout(), DisableMouseCapture);
    ratatui::try_restore()?;
    result
}

fn event_loop(terminal: &mut DefaultTerminal, mut app: App) -> io::Result<()> {
    let size = terminal.size()?;
    app.resize(size.width.into(), size.height.into());
    let mut title = String::new();
    let mut mouse = false;
    let mut next_tick = Instant::now() + TICK;
    while !app.should_quit() {
        terminal.draw(|f| app.draw(f))?;
        if app.window_title() != title {
            title = app.window_title();
            execute!(stdout(), SetTitle(&title))?;
        }
        if app.wants_mouse() != mouse {
            mouse = !mouse;
            if mouse {
                execute!(stdout(), EnableMouseCapture)?;
            } else {
                execute!(stdout(), DisableMouseCapture)?;
            }
        }
        let wake = app.next_timer().map_or(next_tick, |t| t.min(next_tick));
        if event::poll(wake.saturating_duration_since(Instant::now()))? {
            match event::read()? {
                Event::Key(k) if k.kind != KeyEventKind::Release => {
                    app.update(Msg::Key(KeyPress::new(k)));
                }
                Event::Mouse(m) => {
                    if let Some(m) = app::shift_mouse(m) {
                        app.update(Msg::Mouse(m));
                    }
                }
                Event::Resize(w, h) => app.resize(w.into(), h.into()),
                _ => {}
            }
        }
        let now = Instant::now();
        app.deliver(now);
        if let Some(text) = app.take_clipboard() {
            execute!(stdout(), CopyToClipboard::to_clipboard_from(text))?;
        }
        if let Some((mut cmd, done)) = app.take_exec() {
            if mouse {
                execute!(stdout(), DisableMouseCapture)?;
                mouse = false;
            }
            // Same steps as ratatui's restore/init, keeping this terminal and its panic hook.
            term::disable_raw_mode()?;
            execute!(
                stdout(),
                term::LeaveAlternateScreen,
                crossterm::cursor::Show
            )?;
            let res = run_suspended(&mut cmd);
            term::enable_raw_mode()?;
            execute!(stdout(), term::EnterAlternateScreen)?;
            terminal.clear()?;
            title.clear();
            app.update(done(res));
        }
        if now >= next_tick {
            next_tick = now + TICK;
            app.update(Msg::Tick);
        }
    }
    Ok(())
}

/// Go's exec error text: `exit status 1`, or the spawn error.
fn run_suspended(cmd: &mut std::process::Command) -> Result<(), String> {
    let status = cmd.status().map_err(|e| e.to_string())?;
    match status.code() {
        Some(0) => Ok(()),
        Some(code) => Err(format!("exit status {code}")),
        None => Err(status.to_string()),
    }
}
