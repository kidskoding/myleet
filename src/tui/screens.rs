//! The tab registry and the constructors screens use to open each other.

use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared};
use super::ui::{self, Lines};
use super::widgets::indent;

/// The root screen for tab i (0 today, 1 map, 2 timed, 3 playlists, 4 stats).
/// An out-of-range index opens Today.
pub fn new_tab(sh: &mut Shared, i: usize) -> Box<dyn Screen> {
    match i {
        1 => Box::new(super::mapscreen::MapScreen::new()),
        2 => Box::new(super::interview::Interview::new(sh)),
        3 => Box::new(super::playlists::Playlists::new()),
        4 => Box::new(super::settings::Settings::new()),
        _ => Box::new(super::home::Home::new()),
    }
}

/// The screen `/` and `ctrl+k` push.
pub fn new_search(sh: &mut Shared) -> Box<dyn Screen> {
    Box::new(super::search::Search::new(&sh.app.catalog))
}

/// The problem screen every other screen opens; `mode` is a `progress::mode` value.
pub fn new_focus(sh: &mut Shared, problem_id: &str, mode: &str) -> Box<dyn Screen> {
    let Some(p) = sh.app.catalog.problem(problem_id) else {
        return Box::new(MissingProblem {
            title: format!("no problem {problem_id:?}"),
        });
    };
    Box::new(super::focus::Focus::new(sh, p, mode_const(mode)))
}

/// Modes are compared as constants throughout Focus.
fn mode_const(mode: &str) -> &'static str {
    use crate::progress::mode::*;
    [INTERVIEW, PLACEMENT, CHECKPOINT, DRILL]
        .into_iter()
        .find(|m| *m == mode)
        .unwrap_or(PRACTICE)
}

/// The recommended check-in Today's `c` opens (Go `NewInterviewCheckpoint`).
pub fn new_checkpoint(sh: &mut Shared) -> Box<dyn Screen> {
    Box::new(super::interview::Interview::checkpoint(sh))
}

/// What a stale id (an old playlist entry or saved queue) opens instead of crashing.
struct MissingProblem {
    title: String,
}

impl Screen for MissingProblem {
    fn title(&self) -> String {
        self.title.clone()
    }

    fn kind(&self) -> Kind {
        Kind::Focus
    }

    fn keys(&self) -> Vec<ui::Key> {
        vec![ui::Key::new("esc", "back")]
    }

    fn view(&self, sh: &Shared, width: usize, _height: usize) -> Lines {
        let th = &sh.theme;
        let body = vec![Line::from(Span::styled(
            "this id is not in the catalog",
            th.muted,
        ))];
        let mut out = vec![Line::default()];
        out.extend(indent(
            ui::card(th, &self.title, body, width.saturating_sub(4), false),
            2,
        ));
        out
    }

    fn update(&mut self, _sh: &mut Shared, msg: &Msg) -> Cmd {
        match msg {
            Msg::Key(k) if k.name == "esc" => Cmd::Pop,
            _ => Cmd::None,
        }
    }
}
