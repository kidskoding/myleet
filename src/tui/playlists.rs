//! The playlists tab: company playlists under their group headers with progress;
//! tracked entries open the problem, the rest open in the browser. Ported from
//! internal/tui/playlists.go.

use std::cell::Cell;
use std::collections::HashMap;

use ratatui::style::Modifier;
use ratatui::text::{Line, Span};

use super::app::{Cmd, Msg, Screen, Shared};
use super::filter::{ListFilter, settle, step};
use super::screens::new_focus;
use super::ui::{self, Key, Lines, Tone};
use super::widgets::{difficulty_badge, fit_height, frac, glyph, indent, scroll_window, status_of};
use crate::catalog::{Catalog, Playlist};
use crate::progress::mode;
use crate::schedule::{State, Status};

#[derive(Default)]
pub struct Playlists {
    /// The playlist whose entries are shown, an index into `catalog.playlists`.
    open: Option<usize>,
    /// The open playlist's title, for the window title.
    open_title: String,
    cursor: usize,
    entry: usize,
    offset: Cell<usize>,
    filter: ListFilter,
}

/// One drawn line: a row index, or a group header (or the blank above one).
enum ListLine {
    Row(usize),
    Header(Line<'static>),
}

/// Mastered and trackable entries, and entries that only open in the browser.
pub fn playlist_counts(
    c: &Catalog,
    p: &Playlist,
    states: &HashMap<String, State>,
) -> (usize, usize, usize) {
    let (mut mastered, mut trackable, mut external) = (0, 0, 0);
    for e in &p.entries {
        let Some(i) = e.problem else {
            external += 1;
            continue;
        };
        trackable += 1;
        if status_of(states, &c.problems()[i].id).status == Status::Mastered {
            mastered += 1;
        }
    }
    (mastered, trackable, external)
}

impl Playlists {
    pub fn new() -> Playlists {
        Playlists::default()
    }

    /// The playlists tab opened on one playlist (an index into `catalog.playlists`).
    pub fn opened(c: &Catalog, i: usize) -> Playlists {
        Playlists {
            open: Some(i),
            open_title: c.playlists[i].title.clone(),
            cursor: i,
            ..Playlists::default()
        }
    }

    fn labels(&self, c: &Catalog) -> Vec<String> {
        match self.open {
            None => c.playlists.iter().map(|p| p.title.clone()).collect(),
            Some(i) => c.playlists[i]
                .entries
                .iter()
                .map(|e| {
                    e.problem
                        .map_or(e.title.clone(), |p| c.problems()[p].title.clone())
                })
                .collect(),
        }
    }

    /// Puts a header above each group of companies; filtered results drop the headers.
    fn lines(&self, sh: &Shared, vis: &[usize]) -> Vec<ListLine> {
        let lists = &sh.app.catalog.playlists;
        let grouped = self.open.is_none() && !(self.filter.on && !self.filter.query.is_empty());
        let mut out = Vec::with_capacity(vis.len() * 2);
        let mut last: Option<&str> = None;
        for &i in vis {
            let group = if grouped { lists[i].group.as_str() } else { "" };
            if grouped && last != Some(group) {
                last = Some(group);
                if !out.is_empty() {
                    out.push(ListLine::Header(Line::default()));
                }
                let count = lists.iter().filter(|p| p.group == group).count();
                out.push(ListLine::Header(Line::from(Span::styled(
                    format!("{} · {count}", group.to_uppercase()),
                    sh.theme.muted.add_modifier(Modifier::BOLD),
                ))));
            }
            out.push(ListLine::Row(i));
        }
        out
    }

    fn rows(&self, sh: &Shared, inner: usize) -> (String, Lines) {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let states = sh.app.states();
        let Some(open) = self.open else {
            let rows = c
                .playlists
                .iter()
                .map(|p| {
                    let (m, t, ext) = playlist_counts(c, p, states);
                    let ext = if ext > 0 {
                        format!(" · {ext:2} ext")
                    } else {
                        " ".repeat(9)
                    };
                    let mut meta = vec![Span::raw(" ")];
                    meta.extend(ui::bar(th, frac(m, t), 12, Tone::Pass).spans);
                    meta.push(Span::styled(format!(" {m:3}/{t:<3}{ext}"), th.muted));
                    let meta = Line::from(meta);
                    let left = ui::pad(
                        Line::from(p.title.clone()),
                        inner.saturating_sub(meta.width()).max(4),
                    );
                    let mut spans = left.spans;
                    spans.extend(meta.spans);
                    Line::from(spans)
                })
                .collect();
            return ("playlists".into(), rows);
        };
        let p = &c.playlists[open];
        let mut title = p.title.clone();
        if !p.focus.is_empty() {
            title = format!("{title} · {}", p.focus);
        }
        let rows = p
            .entries
            .iter()
            .enumerate()
            .map(|(i, e)| {
                let num = Span::styled(format!("{:2} ", i + 1), th.muted);
                let Some(pi) = e.problem else {
                    let name = ui::pad(Line::from(e.title.clone()), inner.saturating_sub(6).max(4));
                    let text: String = name.spans.iter().map(|s| s.content.as_ref()).collect();
                    return Line::from(vec![num, Span::styled(format!("{text} ↗"), th.muted)]);
                };
                let prob = &c.problems()[pi];
                let badge = Line::from(vec![Span::raw(" "), difficulty_badge(th, prob.difficulty)]);
                let name = ui::pad(
                    Line::from(prob.title.clone()),
                    inner.saturating_sub(5 + badge.width()).max(4),
                );
                let mut spans = vec![
                    num,
                    glyph(th, status_of(states, &prob.id).status),
                    Span::raw(" "),
                ];
                spans.extend(name.spans);
                spans.extend(badge.spans);
                Line::from(spans)
            })
            .collect();
        (title, rows)
    }
}

impl Screen for Playlists {
    fn title(&self) -> String {
        match self.open {
            Some(_) => self.open_title.clone(),
            None => "playlists".into(),
        }
    }

    fn tab(&self) -> Option<usize> {
        Some(3)
    }

    fn owns_key(&self, key: &str) -> bool {
        self.filter.owns(key)
    }

    fn filters(&self) -> bool {
        true
    }

    fn start_filter(&mut self) -> bool {
        self.filter.start();
        true
    }

    fn keys(&self) -> Vec<Key> {
        if self.filter.on {
            return vec![
                Key::new("↑/↓", "move"),
                Key::new("enter", "open"),
                Key::new("esc", "clear"),
            ];
        }
        if self.open.is_some() {
            return vec![
                Key::new("enter", "open"),
                Key::new("←", "back"),
                Key::new("/", "filter"),
            ];
        }
        vec![
            Key::new("enter", "open"),
            Key::new("↑/↓", "move"),
            Key::new("/", "filter"),
        ]
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        let labels = self.labels(&sh.app.catalog);
        let cur = if self.open.is_some() {
            self.entry
        } else {
            self.cursor
        };
        let set = |pl: &mut Playlists, v: usize| {
            if pl.open.is_some() {
                pl.entry = v;
            } else {
                pl.cursor = v;
            }
        };
        if self.filter.edit(k) {
            let vis = self.filter.visible(&labels);
            set(self, settle(&vis, cur));
            self.offset.set(0);
            return Cmd::None;
        }
        let vis = self.filter.visible(&labels);
        let name = k.name.as_str();
        match name {
            "j" | "down" => set(self, step(&vis, cur, 1)),
            "k" | "up" => set(self, step(&vis, cur, -1)),
            "esc" | "h" | "left" => {
                self.filter.stop();
                if self.open.is_none() {
                    return if name == "esc" { Cmd::Pop } else { Cmd::None };
                }
                self.open = None;
                self.offset.set(0);
            }
            "enter" | "l" | "right" => {
                if vis.is_empty() {
                    return Cmd::None;
                }
                let Some(open) = self.open else {
                    if self.cursor < sh.app.catalog.playlists.len() {
                        self.filter.stop();
                        self.open = Some(self.cursor);
                        self.open_title = sh.app.catalog.playlists[self.cursor].title.clone();
                        self.entry = 0;
                        self.offset.set(0);
                    }
                    return Cmd::None;
                };
                let Some(e) = sh.app.catalog.playlists[open].entries.get(self.entry) else {
                    return Cmd::None;
                };
                if let Some(pi) = e.problem {
                    let id = sh.app.catalog.problems()[pi].id.clone();
                    return Cmd::Push(new_focus(sh, &id, mode::PRACTICE));
                }
                let url = e.url.clone();
                if let Err(err) = (sh.open)(&url) {
                    sh.toast(err);
                }
            }
            _ => {}
        }
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let card_w = w.saturating_sub(4);
        let inner = card_w.saturating_sub(6);
        let (title, rows) = self.rows(sh, inner);
        let cursor = if self.open.is_some() {
            self.entry
        } else {
            self.cursor
        };
        let mut visible = h.saturating_sub(3).max(1);
        let mut body = Vec::new();
        if self.filter.on {
            body.push(self.filter.line(th));
            visible = visible.saturating_sub(1).max(1);
        }
        let vis = self.filter.visible(&self.labels(&sh.app.catalog));
        if vis.is_empty() {
            body.push(Line::from(Span::styled("no matches", th.muted)));
        }
        let lines = self.lines(sh, &vis);
        let at = lines
            .iter()
            .rposition(|l| matches!(l, ListLine::Row(r) if *r == cursor))
            .unwrap_or(0);
        let mut offset = scroll_window(at, self.offset.get(), visible);
        // scroll_window pins the cursor to the top on the way up, which clips the
        // group header above it; pull those lines back while the cursor still shows.
        while offset > 0
            && matches!(lines[offset - 1], ListLine::Header(_))
            && at < offset - 1 + visible
        {
            offset -= 1;
        }
        self.offset.set(offset);
        for l in lines.iter().skip(offset).take(visible) {
            match l {
                ListLine::Header(line) => body.push(line.clone()),
                ListLine::Row(r) => {
                    let marker = if *r == cursor {
                        Span::styled("▸ ", th.accent)
                    } else {
                        Span::raw("  ")
                    };
                    let mut spans = vec![marker];
                    spans.extend(rows[*r].spans.clone());
                    body.push(ui::pad(Line::from(spans), inner + 2));
                }
            }
        }
        let body = fit_height(body, h.saturating_sub(3).max(1));
        let mut out = vec![Line::default()];
        out.extend(indent(ui::card(th, &title, body, card_w, true), 2));
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::PlaylistEntry;
    use crate::tui::app::{KeyPress, Kind};
    use crate::tui::browse_testing::*;
    use crate::tui::theme::assert_palette;
    use std::cell::RefCell;
    use std::rc::Rc;

    fn key(sh: &mut Shared, s: &mut Playlists, k: &str) -> Cmd {
        s.update(sh, &Msg::Key(KeyPress::named(k)))
    }

    fn text(s: &Playlists, sh: &Shared, w: usize, h: usize) -> String {
        s.view(sh, w, h)
            .iter()
            .map(ui::plain)
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn mastered_two_sum() -> Vec<crate::progress::Event> {
        [1, 2, 5, 12]
            .iter()
            .flat_map(|&d| passed_events("two-sum", d))
            .collect()
    }

    #[test]
    fn progress_counts() {
        let sh = shared(Vec::new());
        let view = text(&Playlists::new(), &sh, 80, 21);
        assert!(
            view.contains("Meta") && view.contains("0/2") && view.contains("1 ext"),
            "{view}"
        );
        let sh = shared(mastered_two_sum());
        assert!(text(&Playlists::new(), &sh, 80, 21).contains("1/2"));
    }

    #[test]
    fn golden() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["4"]);
        let view = render(&mut a, 80, 24);
        assert_golden(&go_golden("playlists"), &view);
        assert!(view.contains("│ ▸ Meta"), "{view}");
    }

    #[test]
    fn detail_opens_focus_and_urls() {
        let mut sh = shared(Vec::new());
        let opened = Rc::new(RefCell::new(String::new()));
        let o = opened.clone();
        sh.open = Box::new(move |u| {
            *o.borrow_mut() = u.to_string();
            Ok(())
        });
        let mut pl = Playlists::new();
        key(&mut sh, &mut pl, "enter");
        let view = text(&pl, &sh, 80, 21);
        assert!(
            view.contains("Two Sum") && view.contains("LRU Cache"),
            "{view}"
        );
        assert!(view.contains("╭─ Meta · speed"), "{view}");
        match key(&mut sh, &mut pl, "enter") {
            Cmd::Push(s) => assert!(s.kind() == Kind::Focus && s.title().contains("Two Sum")),
            _ => panic!("enter on two-sum should push focus"),
        }
        key(&mut sh, &mut pl, "j");
        assert!(matches!(key(&mut sh, &mut pl, "enter"), Cmd::None));
        assert_eq!(*opened.borrow(), "https://leetcode.com/problems/lru-cache/");
        sh.open = Box::new(|_| Err("no browser".into()));
        key(&mut sh, &mut pl, "enter");
        assert_eq!(sh.toast_text(), "no browser");
        key(&mut sh, &mut pl, "left");
        assert!(pl.open.is_none());
        assert!(matches!(key(&mut sh, &mut pl, "esc"), Cmd::Pop));
    }

    #[test]
    fn bars_align() {
        let mut sh = shared(Vec::new());
        let two = sh
            .app
            .catalog
            .problems()
            .iter()
            .position(|p| p.id == "two-sum");
        sh.app.catalog.playlists.push(Playlist {
            id: "x".into(),
            title: "Very Long Company Name".into(),
            group: String::new(),
            focus: String::new(),
            entries: vec![PlaylistEntry {
                title: "Two Sum".into(),
                url: String::new(),
                problem: two,
            }],
        });
        let view = text(&Playlists::new(), &sh, 80, 21);
        let cols: std::collections::HashSet<usize> = view
            .lines()
            .filter_map(|l| l.find('░').map(|i| l[..i].chars().count()))
            .collect();
        assert_eq!(cols.len(), 1, "every bar starts in one column:\n{view}");
    }

    #[test]
    fn group_headers_and_cursor() {
        let mut sh = shared(Vec::new());
        let mut pl = Playlists::new();
        let view = text(&pl, &sh, 80, 21);
        let at = |s: &str| view.lines().position(|l| l.contains(s)).unwrap();
        assert!(at("BIG TECH") < at("Meta") && at("Meta") < at("AI LABS / HIGH GROWTH"));
        assert!(at("AI LABS / HIGH GROWTH") < at("Stripe"));
        key(&mut sh, &mut pl, "down");
        key(&mut sh, &mut pl, "enter");
        assert_eq!(pl.open, Some(1), "down skips the header onto Stripe");
        assert_palette(&pl.view(&sh, 80, 21));
    }

    #[test]
    fn group_header_returns_on_scroll_up() {
        let mut sh = shared(Vec::new());
        let stripe = sh.app.catalog.playlists.pop().unwrap();
        for i in 0..15 {
            sh.app.catalog.playlists.push(Playlist {
                id: format!("big-{i}"),
                title: format!("BigCo{i}"),
                group: "Big tech".into(),
                focus: String::new(),
                entries: Vec::new(),
            });
        }
        sh.app.catalog.playlists.push(stripe);
        let mut pl = Playlists::new();
        for _ in 0..12 {
            key(&mut sh, &mut pl, "j");
            text(&pl, &sh, 80, 9);
        }
        assert!(!text(&pl, &sh, 80, 9).contains("BIG TECH"));
        for _ in 0..12 {
            key(&mut sh, &mut pl, "k");
            text(&pl, &sh, 80, 9);
        }
        let view = text(&pl, &sh, 80, 9);
        assert!(view.contains("BIG TECH") && view.contains("Meta"), "{view}");
    }

    #[test]
    fn filter_companies_and_problems() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["4", "/"]);
        typed(&mut a, "str");
        let view = render(&mut a, 80, 24);
        assert!(
            view.contains("/ str") && view.contains("Stripe") && !view.contains("Meta"),
            "{view}"
        );
        assert!(!view.contains("AI LABS"), "filtered results drop headers");
        send(&mut a, &["esc"]);
        let view = render(&mut a, 80, 24);
        assert!(
            view.contains("Meta") && !view.contains("/ str"),
            "first esc clears:\n{view}"
        );
        assert_eq!(a.depth(), 1);

        let mut a = app_with(Vec::new());
        send(&mut a, &["4", "/"]);
        typed(&mut a, "q");
        assert!(!a.should_quit() && a.top().title() == "playlists");

        let mut sh = shared(Vec::new());
        let mut pl = Playlists::new();
        pl.start_filter();
        for k in ["s", "t", "r", "enter"] {
            key(&mut sh, &mut pl, k);
        }
        assert_eq!(pl.open, Some(1), "enter opens the filtered company");
        let mut pl = Playlists::new();
        key(&mut sh, &mut pl, "enter");
        pl.start_filter();
        for c in "logger".chars() {
            key(&mut sh, &mut pl, &c.to_string());
        }
        let view = text(&pl, &sh, 80, 21);
        assert!(
            view.contains("Logger Rate Limiter") && !view.contains("Two Sum"),
            "{view}"
        );
        match key(&mut sh, &mut pl, "enter") {
            Cmd::Push(s) => assert!(s.title().contains("Logger Rate Limiter")),
            _ => panic!("enter opens the filtered problem"),
        }
    }

    #[test]
    fn fits_all_sizes() {
        let mut sh = shared(Vec::new());
        let mut pl = Playlists::new();
        for open in [false, true] {
            if open {
                key(&mut sh, &mut pl, "enter");
            }
            for w in (60..=160).step_by(7) {
                for h in (17..=37).step_by(5) {
                    assert_fits(&text(&pl, &sh, w, h), w, h);
                }
            }
        }
    }
}
