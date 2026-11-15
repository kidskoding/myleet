//! The tab registry. Each real screen replaces its placeholder arm here when
//! it is ported (Today, Map, Timed, Playlists, Stats, Search).

use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared, TAB_NAMES};
use super::ui::{self, Lines, Tone};
use super::widgets::indent;

/// The root screen for tab i (0 today, 1 map, 2 timed, 3 playlists, 4 stats).
pub fn new_tab(_sh: &mut Shared, i: usize) -> Box<dyn Screen> {
    let i = if i < TAB_NAMES.len() { i } else { 0 };
    Box::new(Placeholder {
        title: TAB_NAMES[i],
        tab: Some(i),
        kind: if i == 0 { Kind::Home } else { Kind::Other },
    })
}

/// The screen `/` and `ctrl+k` push.
pub fn new_search(_sh: &mut Shared) -> Box<dyn Screen> {
    Box::new(Placeholder {
        title: "search",
        tab: None,
        kind: Kind::Search,
    })
}

struct Placeholder {
    title: &'static str,
    tab: Option<usize>,
    kind: Kind,
}

impl Screen for Placeholder {
    fn title(&self) -> String {
        self.title.to_string()
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
            body.push(match &sh.catalog {
                Some(c) => Line::from(vec![
                    Span::styled(c.modules.len().to_string(), th.accent),
                    Span::raw(" modules · "),
                    Span::styled(c.problems().len().to_string(), th.accent),
                    Span::raw(" problems loaded"),
                ]),
                None => Line::from(Span::styled("no curriculum found", th.muted)),
            });
        }
        let mut out = vec![Line::default()];
        out.extend(indent(
            ui::card(th, self.title, body, width.saturating_sub(4), false),
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
