//! The interactive trainer: ratatui + crossterm port of internal/tui.

pub mod app;
#[cfg(test)]
mod browse_testing;
pub mod filter;
mod help;
pub mod mapscreen;
pub mod markdown;
pub mod screens;
pub mod theme;
pub mod ui;
pub mod widgets;

use std::io::{self, stdout};
use std::time::{Duration, Instant};

use crossterm::event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyEventKind};
use crossterm::execute;
use crossterm::terminal::SetTitle;
use ratatui::DefaultTerminal;

pub use app::{App, Cmd, KeyPress, Kind, Msg, Screen, Shared};

const TICK: Duration = Duration::from_secs(1);

/// Runs the trainer until the user quits. The terminal is restored on return
/// and on panic (ratatui's hook, plus mouse capture which it does not undo).
pub fn run(sh: Shared) -> io::Result<()> {
    let prev = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = execute!(stdout(), DisableMouseCapture);
        prev(info);
    }));
    let mut terminal = ratatui::try_init()?;
    let result = event_loop(&mut terminal, App::new(sh));
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
        if now >= next_tick {
            next_tick = now + TICK;
            app.update(Msg::Tick);
        }
    }
    Ok(())
}
