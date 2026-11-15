//! The tab registry. Each real screen replaces its placeholder arm here when
//! it is ported (Today, Map, Timed, Playlists, Stats, Search).

use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared, TAB_NAMES};
use super::ui::{self, Lines, Tone};
use super::widgets::indent;

/// The root screen for tab i (0 today, 1 map, 2 timed, 3 playlists, 4 stats).
pub fn new_tab(_sh: &mut Shared, i: usize) -> Box<dyn Screen> {
    let i = if i < TAB_NAMES.len() { i } else { 0 };
    match i {
        0 => Box::new(super::home::Home::new()),
        _ => Box::new(Placeholder {
            title: TAB_NAMES[i].into(),
            tab: Some(i),
            kind: Kind::Other,
        }),
    }
}

/// The screen `/` and `ctrl+k` push.
pub fn new_search(_sh: &mut Shared) -> Box<dyn Screen> {
    Box::new(Placeholder {
        title: "search".into(),
        tab: None,
        kind: Kind::Search,
    })
}

/// The problem screen every other screen opens; `mode` is a `progress::mode` value.
pub fn new_focus(sh: &mut Shared, problem_id: &str, mode: &str) -> Box<dyn Screen> {
    let title = sh
        .app
        .catalog
        .problem(problem_id)
        .map_or(problem_id, |p| p.title.as_str());
    Box::new(Placeholder {
        title: format!("{title} ({mode})"),
        tab: None,
        kind: Kind::Focus,
    })
}

/// The recommended check-in Today's `c` opens (Go `NewInterviewCheckpoint`).
pub fn new_checkpoint(_sh: &mut Shared) -> Box<dyn Screen> {
    Box::new(Placeholder {
        title: "check-in".into(),
        tab: None,
        kind: Kind::Other,
    })
}

struct Placeholder {
    title: String,
    tab: Option<usize>,
    kind: Kind,
}

impl Screen for Placeholder {
    fn title(&self) -> String {
        self.title.clone()
    }

    fn tab(&self) -> Option<usize> {
        self.tab
    }

    fn kind(&self) -> Kind {
        self.kind
    }

    fn keys(&self) -> Vec<ui::Key> {
        if self.kind == Kind::Home {
            Vec::new()
        } else {
            vec![ui::Key::new("esc", "back")]
        }
    }

    fn view(&self, sh: &Shared, width: usize, _height: usize) -> Lines {
        let th = &sh.theme;
        let mut body = vec![Line::from(vec![
            ui::chip(th, "not ported yet", Tone::Due),
            Span::raw("  "),
            Span::styled("lands in a later step of the Rust port", th.muted),
        ])];
        if self.kind == Kind::Home {
            body.push(Line::default());
            let c = &sh.app.catalog;
            body.push(Line::from(vec![
                Span::styled(c.modules.len().to_string(), th.accent),
                Span::raw(" modules · "),
                Span::styled(c.problems().len().to_string(), th.accent),
                Span::raw(" problems loaded"),
            ]));
        }
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
