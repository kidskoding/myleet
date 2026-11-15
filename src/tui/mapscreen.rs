//! The map tab (guide notes, then modules, techniques and problems in drill-down
//! columns) and the notes reader it opens. Ported from internal/tui/mapscreen.go.

use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use jiff::Timestamp;
use ratatui::text::{Line, Span};

use super::app::{Cmd, Msg, Screen, Shared};
use super::filter::{ListFilter, settle, step};
use super::markdown::render_markdown;
use super::screens::new_focus;
use super::theme::Theme;
use super::ui::{self, BadgeKind, Key, Lines, Tone};
use super::widgets::{difficulty_badge, fit_height, frac, glyph, indent, scroll_window, status_of};
use crate::catalog::{Catalog, Module, Problem, Technique, note_title};
use crate::progress::mode;
use crate::schedule::{State, Status, local_day};

const WIDE_MAP: usize = 100;
const COLUMN_GAP: usize = 2;
/// Bar plus ` 100%`.
const METER_WIDTH: usize = 16;

/// Card border, padding and the row marker around a column's rows.
const ROW_CHROME: usize = 6;

#[derive(Default)]
pub struct MapScreen {
    level: usize,
    /// Cursor per level: module (with Start here as row 0 when there is a guide), technique, problem.
    cur: [usize; 3],
    offsets: [Cell<usize>; 3],
    filter: ListFilter,
}

/// Titles joiners like "And" and "Of" lowercase, since the curriculum title-cases every word.
pub fn display_title(title: &str) -> String {
    const JOINERS: [&str; 9] = ["and", "or", "of", "the", "a", "an", "in", "on", "to"];
    title
        .split(' ')
        .enumerate()
        .map(|(i, w)| {
            if i > 0 && JOINERS.contains(&w.to_lowercase().as_str()) {
                w.to_lowercase()
            } else {
                w.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// The taught curriculum only; playlist-only (bank) problems stay off the map.
fn modules(c: &Catalog) -> Vec<&Module> {
    c.modules.iter().filter(|m| !m.bank).collect()
}

fn local_midnight(sh: &Shared) -> Timestamp {
    let now = (sh.app.now)();
    local_day(now, &sh.app.tz)
        .to_zoned(sh.app.tz.clone())
        .map_or(now, |z| z.timestamp())
}

fn read_note(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))
}

impl MapScreen {
    pub fn new() -> MapScreen {
        MapScreen::default()
    }

    /// The map opened on a module (an index into `catalog.modules`) or one of its techniques.
    pub fn at(c: &Catalog, module: usize, technique: Option<usize>) -> MapScreen {
        let mut m = MapScreen::new();
        let pos = modules(c)
            .iter()
            .position(|x| std::ptr::eq(*x, &c.modules[module]))
            .unwrap_or(0);
        m.cur[0] = pos + usize::from(!c.guide.is_empty());
        if let Some(t) = technique {
            m.level = 1;
            m.cur[1] = t;
        }
        m
    }

    fn on_guide(&self, c: &Catalog) -> bool {
        !c.guide.is_empty() && self.cur[0] == 0
    }

    fn module<'a>(&self, c: &'a Catalog) -> Option<&'a Module> {
        let mods = modules(c);
        let i = if c.guide.is_empty() {
            self.cur[0]
        } else {
            self.cur[0].saturating_sub(1)
        };
        mods.get(i).or(mods.last()).copied()
    }

    fn technique<'a>(&self, c: &'a Catalog) -> Option<&'a Technique> {
        if self.on_guide(c) {
            return None;
        }
        let ts = &self.module(c)?.techniques;
        ts.get(self.cur[1].min(ts.len().checked_sub(1)?))
    }

    fn problems<'a>(&self, c: &'a Catalog) -> Vec<&'a Problem> {
        self.technique(c).map_or(Vec::new(), |t| {
            t.problems.iter().map(|&i| &c.problems()[i]).collect()
        })
    }

    fn size(&self, c: &Catalog, level: usize) -> usize {
        match level {
            0 => modules(c).len() + usize::from(!c.guide.is_empty()),
            1 if self.on_guide(c) => c.guide.len(),
            1 => self.module(c).map_or(0, |m| m.techniques.len()),
            _ => self.problems(c).len(),
        }
    }

    /// The names in a column, in the order its rows are drawn.
    fn labels(&self, c: &Catalog, level: usize) -> Vec<String> {
        match level {
            0 => (!c.guide.is_empty())
                .then(|| "Start here".to_string())
                .into_iter()
                .chain(modules(c).iter().map(|m| m.title.clone()))
                .collect(),
            1 if self.on_guide(c) => c.guide.iter().map(|g| g.title.clone()).collect(),
            1 => self.module(c).map_or(Vec::new(), |m| {
                m.techniques.iter().map(|t| t.title.clone()).collect()
            }),
            _ => self.problems(c).iter().map(|p| p.title.clone()).collect(),
        }
    }

    fn title(&self, c: &Catalog) -> String {
        if self.on_guide(c) {
            return "Start here".into();
        }
        self.module(c).map_or(String::new(), |m| m.title.clone())
    }

    fn note(&self, c: &Catalog) -> Option<PathBuf> {
        if self.on_guide(c) {
            return c
                .guide
                .get(self.cur[1].min(c.guide.len() - 1))
                .map(|g| g.path.clone());
        }
        if self.level > 0 {
            if let Some(n) = self.technique(c).and_then(|t| t.note.clone()) {
                return Some(n);
            }
        }
        self.module(c)?.notes.first().cloned()
    }

    fn module_rows(&self, sh: &Shared, states: &HashMap<String, State>, width: usize) -> Lines {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let mut rows = Vec::new();
        if !c.guide.is_empty() {
            let meta = format!(" {} notes", c.guide.len());
            rows.push(meta_row(
                Line::from(Span::styled("Start here", th.accent)),
                Line::from(Span::styled(meta, th.muted)),
                width,
            ));
        }
        for m in modules(c) {
            let (mut mastered, mut total) = (0, 0);
            for t in &m.techniques {
                for &i in &t.problems {
                    total += 1;
                    if status_of(states, &c.problems()[i].id).status == Status::Mastered {
                        mastered += 1;
                    }
                }
            }
            let f = frac(mastered, total);
            let mut meter = vec![Span::raw(" ")];
            meter.extend(ui::bar(th, f, 10, Tone::Pass).spans);
            meter.push(Span::styled(format!(" {:3.0}%", 100.0 * f), th.muted));
            rows.push(meta_row(module_label(th, m), Line::from(meter), width));
        }
        rows
    }

    fn technique_rows(
        &self,
        sh: &Shared,
        states: &HashMap<String, State>,
        today: Timestamp,
        width: usize,
    ) -> Lines {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        if self.on_guide(c) {
            return c
                .guide
                .iter()
                .map(|g| ui::pad(Line::from(g.title.clone()), width))
                .collect();
        }
        let Some(m) = self.module(c) else {
            return Vec::new();
        };
        m.techniques
            .iter()
            .map(|t| {
                let (mut mastered, mut due) = (0, 0);
                for &i in &t.problems {
                    let st = status_of(states, &c.problems()[i].id);
                    if st.status == Status::Mastered {
                        mastered += 1;
                    }
                    if st.status != Status::Unseen && st.due.is_none_or(|d| d <= today) {
                        due += 1;
                    }
                }
                let mut meta = Vec::new();
                if due > 0 {
                    meta.push(Span::raw(" "));
                    meta.push(ui::badge(th, &format!("{due} due"), BadgeKind::Review));
                }
                meta.push(Span::styled(
                    format!(" {mastered}/{}", t.problems.len()),
                    th.muted,
                ));
                meta_row(Line::from(display_title(&t.title)), Line::from(meta), width)
            })
            .collect()
    }

    fn problem_rows(&self, sh: &Shared, states: &HashMap<String, State>, width: usize) -> Lines {
        let th = &sh.theme;
        self.problems(&sh.app.catalog)
            .iter()
            .map(|p| {
                let badge = Line::from(vec![Span::raw(" "), difficulty_badge(th, p.difficulty)]);
                let mut spans = vec![glyph(th, status_of(states, &p.id).status), Span::raw(" ")];
                spans.extend(
                    meta_row(Line::from(p.title.clone()), badge, width.saturating_sub(2)).spans,
                );
                ui::pad(Line::from(spans), width)
            })
            .collect()
    }

    /// The opening paragraph of the selected guide note.
    fn guide_preview(&self, sh: &Shared, width: usize) -> Lines {
        let th = &sh.theme;
        let Some(path) = self.note(&sh.app.catalog) else {
            return Vec::new();
        };
        let data = match read_note(&path) {
            Ok(d) => d,
            Err(e) => return vec![Line::from(e)],
        };
        let mut para: Vec<String> = Vec::new();
        for line in data.lines().map(str::trim) {
            if line.starts_with('#') {
                continue;
            }
            if line.is_empty() {
                if para.is_empty() {
                    continue;
                }
                break;
            }
            para.push(line.replace("**", "").replace('`', ""));
        }
        let mut rows = ui::wrap_lines(Line::from(para.join(" ")), width.max(1));
        rows.push(Line::default());
        rows.push(Line::from(Span::styled("enter to read", th.muted)));
        rows
    }

    /// Marks the selection in levels above the current one so the path stays visible.
    #[allow(clippy::too_many_arguments)]
    fn column(
        &self,
        th: &Theme,
        c: &Catalog,
        level: usize,
        title: &str,
        rows: Lines,
        width: usize,
        height: usize,
    ) -> Lines {
        let cursor = self.cur[level];
        let mut visible = height.saturating_sub(2).max(1);
        let mut body = Vec::new();
        let shown: Vec<usize> = if level == self.level && self.filter.on {
            body.push(self.filter.line(th));
            visible = visible.saturating_sub(1).max(1);
            let shown = self.filter.visible(&self.labels(c, level));
            if shown.is_empty() {
                body.push(Line::from(Span::styled("no matches", th.muted)));
            }
            shown
        } else {
            (0..rows.len()).collect()
        };
        let at = shown.iter().position(|&i| i == cursor).unwrap_or(0);
        let offset = scroll_window(at, self.offsets[level].get(), visible);
        self.offsets[level].set(offset);
        for &i in shown.iter().skip(offset).take(visible) {
            let Some(row) = rows.get(i) else { continue };
            let marker = if i == cursor && level == self.level {
                Span::styled("▸ ", th.accent)
            } else if i == cursor && level < self.level {
                Span::styled("› ", th.muted)
            } else {
                Span::raw("  ")
            };
            let mut spans = vec![marker];
            spans.extend(row.spans.clone());
            body.push(Line::from(spans));
        }
        let body = fit_height(body, height.saturating_sub(2).max(1));
        ui::card(th, title, body, width, level == self.level)
    }

    /// Column widths for the wide layout: the modules column gets the width its
    /// longest row needs (Go cut names like "Arrays And Has…" while the techniques
    /// column sat half empty), techniques a fixed share, problems the rest.
    fn widths(&self, c: &Catalog, w: usize) -> [usize; 3] {
        let avail = w.saturating_sub(4 + 2 * COLUMN_GAP);
        let longest = modules(c)
            .iter()
            .map(|m| {
                ui::str_width(&format!("{:02} {}", m.number, display_title(&m.title))) + METER_WIDTH
            })
            .chain((!c.guide.is_empty()).then(|| 10 + format!(" {} notes", c.guide.len()).len()))
            .max()
            .unwrap_or(0);
        // Two spare columns keep the name from butting into the bar.
        let module = (longest + 2 + ROW_CHROME).min(avail * 45 / 100);
        let technique = 32.min(avail * 3 / 10);
        [module, technique, avail.saturating_sub(module + technique)]
    }
}

/// A row of exactly width columns: left padded (or cut) so right ends flush.
fn meta_row(left: Line<'static>, right: Line<'static>, width: usize) -> Line<'static> {
    let left = ui::pad(left, width.saturating_sub(right.width()).max(4));
    let mut spans = left.spans;
    spans.extend(right.spans);
    ui::pad(Line::from(spans), width)
}

fn module_label(th: &Theme, m: &Module) -> Line<'static> {
    Line::from(vec![
        Span::styled(format!("{:02} ", m.number), th.muted),
        Span::raw(display_title(&m.title)),
    ])
}

impl Screen for MapScreen {
    fn title(&self) -> String {
        "map".into()
    }

    fn tab(&self) -> Option<usize> {
        Some(1)
    }

    fn help(&self) -> Lines {
        [
            "→/enter  drill in (enter on a problem opens it)",
            "←/esc    back out",
            "n        open the note for this module or technique",
        ]
        .into_iter()
        .map(Line::from)
        .collect()
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
        vec![
            Key::new("enter", "open"),
            Key::new("←", "back"),
            Key::new("/", "filter"),
            Key::new("n", "notes"),
        ]
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        let c = &sh.app.catalog;
        let level = self.level;
        let vis = self.filter.visible(&self.labels(c, level));
        let name = k.name.as_str();
        if self.filter.edit(k) {
            let vis = self.filter.visible(&self.labels(c, level));
            self.cur[level] = settle(&vis, self.cur[level]);
            self.offsets[level].set(0);
        } else {
            match name {
                "j" | "down" => self.cur[level] = step(&vis, self.cur[level], 1),
                "k" | "up" => self.cur[level] = step(&vis, self.cur[level], -1),
                "l" | "enter" | "right" => {
                    if vis.is_empty() {
                        return Cmd::None;
                    }
                    self.filter.stop();
                    if self.on_guide(c) && level == 1 {
                        return match c.guide.get(self.cur[1]) {
                            Some(g) => Cmd::Push(Box::new(Notes::new(g.path.clone()))),
                            None => Cmd::None,
                        };
                    }
                    if level == 2 {
                        if name == "enter" {
                            if let Some(id) =
                                self.problems(c).get(self.cur[2]).map(|p| p.id.clone())
                            {
                                return Cmd::Push(new_focus(sh, &id, mode::PRACTICE));
                            }
                        }
                        return Cmd::None;
                    }
                    if self.size(c, level + 1) > 0 {
                        self.level += 1;
                        self.cur[self.level] = 0;
                    }
                }
                "h" | "esc" | "left" => {
                    self.filter.stop();
                    if level == 0 {
                        return if name == "esc" { Cmd::Pop } else { Cmd::None };
                    }
                    self.level -= 1;
                }
                "n" => {
                    if let Some(note) = self.note(c) {
                        return Cmd::Push(Box::new(Notes::new(note)));
                    }
                    let msg = format!("no notes for {}", self.title(c));
                    sh.toast(msg);
                }
                _ => {}
            }
        }
        match self.level {
            0 => {
                self.cur[1] = 0;
                self.cur[2] = 0;
            }
            1 => self.cur[2] = 0,
            _ => {}
        }
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let states = sh.app.states();
        let today = local_midnight(sh);
        let height = h.saturating_sub(1).max(5);
        let tech_title = self
            .technique(c)
            .map_or(String::new(), |t| t.title.to_lowercase());
        let mut out = vec![Line::default()];
        if w >= WIDE_MAP {
            let widths = self.widths(c, w);
            let rows = |i: usize| widths[i].saturating_sub(ROW_CHROME);
            let mut cols = vec![
                self.column(
                    th,
                    c,
                    0,
                    "modules",
                    self.module_rows(sh, states, rows(0)),
                    widths[0],
                    height,
                ),
                self.column(
                    th,
                    c,
                    1,
                    &self.title(c).to_lowercase(),
                    self.technique_rows(sh, states, today, rows(1)),
                    widths[1],
                    height,
                ),
                self.column(
                    th,
                    c,
                    2,
                    &tech_title,
                    self.problem_rows(sh, states, rows(2)),
                    widths[2],
                    height,
                ),
            ];
            if self.on_guide(c) {
                let g = &c.guide[self.cur[1].min(c.guide.len() - 1)];
                let inner = height.saturating_sub(2);
                let mut body = self.guide_preview(sh, widths[2].saturating_sub(4));
                body.truncate(inner);
                cols[2] = ui::card(
                    th,
                    &g.title.to_lowercase(),
                    fit_height(body, inner),
                    widths[2],
                    false,
                );
            }
            out.extend(indent(ui::columns(COLUMN_GAP, cols), 2));
            return out;
        }
        let mut crumbs = vec!["map".to_string()];
        if self.level >= 1 {
            crumbs.push(self.title(c).to_lowercase());
        }
        if self.level == 2 {
            crumbs.push(tech_title);
        }
        let inner = w.saturating_sub(4);
        let row_w = inner.saturating_sub(ROW_CHROME);
        let rows = match self.level {
            0 => self.module_rows(sh, states, row_w),
            1 => self.technique_rows(sh, states, today, row_w),
            _ => self.problem_rows(sh, states, row_w),
        };
        let card = self.column(th, c, self.level, &crumbs.join(" › "), rows, inner, height);
        out.extend(indent(card, 2));
        out
    }
}

/// A scrolling reader for one note.
pub struct Notes {
    path: PathBuf,
    title: String,
    /// The rendered note and the width it was rendered at.
    lines: RefCell<Option<(usize, Lines)>>,
    offset: Cell<i64>,
    height: Cell<usize>,
}

impl Notes {
    pub fn new(path: PathBuf) -> Notes {
        Notes {
            title: note_title(&path),
            path,
            lines: RefCell::new(None),
            offset: Cell::new(0),
            height: Cell::new(1),
        }
    }

    fn rendered(&self, th: &Theme, w: usize) -> Lines {
        let mut cache = self.lines.borrow_mut();
        if let Some((cw, lines)) = cache.as_ref() {
            if *cw == w {
                return lines.clone();
            }
        }
        let lines = match read_note(&self.path) {
            Ok(data) => render_markdown(th, &data, w.saturating_sub(4)),
            Err(e) => vec![Line::from(e)],
        };
        *cache = Some((w, lines.clone()));
        lines
    }
}

impl Screen for Notes {
    fn title(&self) -> String {
        self.title.clone()
    }

    fn help(&self) -> Lines {
        [
            "↑/↓ j/k        scroll",
            "pgup/pgdn      half page",
            "home/end g/G   top/bottom",
            "esc            back",
        ]
        .into_iter()
        .map(Line::from)
        .collect()
    }

    fn keys(&self) -> Vec<Key> {
        vec![
            Key::new("↑/↓", "scroll"),
            Key::new("pgup/pgdn", "page"),
            Key::new("esc", "back"),
        ]
    }

    fn update(&mut self, _sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        let page = (self.height.get() / 2).max(1) as i64;
        let off = self.offset.get();
        let len = self.lines.borrow().as_ref().map_or(0, |(_, l)| l.len()) as i64;
        let next = match k.name.as_str() {
            "j" | "down" => off + 1,
            "k" | "up" => off - 1,
            "ctrl+d" | "pgdown" | "space" => off + page,
            "ctrl+u" | "pgup" => off - page,
            "g" | "home" => 0,
            "G" | "end" => len,
            "esc" => return Cmd::Pop,
            _ => off,
        };
        self.offset.set(next);
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let lines = self.rendered(th, w.saturating_sub(4));
        let height = h.saturating_sub(3).max(1);
        self.height.set(height);
        let len = lines.len();
        let offset = self.offset.get().min(len as i64 - height as i64).max(0) as usize;
        self.offset.set(offset as i64);
        let end = (offset + height).min(len);
        let pct = if len > height { end * 100 / len } else { 100 };
        let body = fit_height(lines[offset..end].to_vec(), height);
        let card = ui::card(
            th,
            &format!("{} · {pct}%", self.title),
            body,
            w.saturating_sub(4),
            false,
        );
        let mut out = vec![Line::default()];
        out.extend(indent(card, 2));
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::GuideNote;
    use crate::tui::app::{KeyPress, Kind};
    use crate::tui::browse_testing::*;
    use crate::tui::theme::assert_palette;
    use ratatui::style::Modifier;

    fn key(sh: &mut Shared, s: &mut dyn Screen, k: &str) -> Cmd {
        s.update(sh, &Msg::Key(KeyPress::named(k)))
    }

    fn map_view(events: Vec<crate::progress::Event>, keys: &[&str], w: u16) -> String {
        let mut a = app_with(events);
        send(&mut a, &["2"]);
        send(&mut a, keys);
        render(&mut a, w, 24)
    }

    fn mastered(id: &str) -> Vec<crate::progress::Event> {
        [1, 2, 5, 12]
            .iter()
            .flat_map(|&d| passed_events(id, d))
            .collect()
    }

    #[test]
    fn drill_down_and_back() {
        let mut sh = shared(Vec::new());
        let mut m = MapScreen::new();
        key(&mut sh, &mut m, "l");
        assert_eq!(m.level, 1);
        assert!(ui_text(&m, &sh, 80).contains("One"));
        key(&mut sh, &mut m, "enter");
        assert_eq!(m.level, 2);
        assert!(ui_text(&m, &sh, 80).contains("P One"));
        match key(&mut sh, &mut m, "enter") {
            Cmd::Push(s) => {
                assert_eq!(s.kind(), Kind::Focus);
                assert!(s.title().contains("P One"), "{}", s.title());
            }
            _ => panic!("enter on a problem should push focus"),
        }
        assert!(
            matches!(key(&mut sh, &mut m, "l"), Cmd::None),
            "l on a problem does not open it"
        );
        key(&mut sh, &mut m, "h");
        key(&mut sh, &mut m, "esc");
        assert_eq!(m.level, 0);
        assert!(matches!(key(&mut sh, &mut m, "esc"), Cmd::Pop));
        let mut a = app_with(Vec::new());
        send(&mut a, &["2", "esc"]);
        assert_eq!(a.top().kind(), Kind::Home, "esc at modules returns home");
    }

    fn ui_text(s: &dyn Screen, sh: &Shared, w: usize) -> String {
        s.view(sh, w, 21)
            .iter()
            .map(ui::plain)
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn bars_reflect_states() {
        let view = map_view(mastered("two-sum"), &[], 80);
        assert!(
            view.contains("██████████ 100%"),
            "beta fully mastered:\n{view}"
        );
        assert!(view.contains("░░░░░░░░░░   0%"), "alpha at 0%:\n{view}");
    }

    #[test]
    fn golden_80x24() {
        let view = map_view(Vec::new(), &["l"], 80);
        assert_fits(&view, 80, 24);
        assert_golden(&go_golden("map"), &view);
        assert!(view.contains("╭─ map › alpha"), "breadcrumb title:\n{view}");
    }

    #[test]
    fn golden_wide() {
        let view = map_view(Vec::new(), &["l"], 120);
        assert_fits(&view, 120, 24);
        for want in ["Alpha", "One", "P One"] {
            assert!(view.contains(want), "{want}:\n{view}");
        }
        assert!(
            view.lines().any(|l| l.matches("╭─").count() == 3
                && l.contains("modules")
                && l.contains("alpha")),
            "three titled cards:\n{view}"
        );
        assert_golden(&rust_golden("map_wide"), &view);
    }

    #[test]
    fn wide_modules_column_fits_real_names() {
        let mut sh = shared(Vec::new());
        sh.app.catalog.modules[0].title = "Arrays And Hashing".into();
        sh.app.catalog.modules[1].title = "Mixed Interview Practice".into();
        let view = ui_text(&MapScreen::new(), &sh, 120);
        assert!(view.contains("01 Arrays and Hashing"), "{view}");
        assert!(view.contains("02 Mixed Interview Practice"), "{view}");
        assert!(!view.contains('…'), "{view}");
    }

    #[test]
    fn display_title_lowercases_joiners() {
        assert_eq!(display_title("Arrays And Hashing"), "Arrays and Hashing");
        assert_eq!(display_title("Math And Geometry"), "Math and Geometry");
        assert_eq!(display_title("And Then Of"), "And Then of");
        assert_eq!(
            display_title("Components, Cycles, And Bipartite"),
            "Components, Cycles, and Bipartite"
        );
    }

    #[test]
    fn notes_open_render_and_return() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["2", "n"]);
        assert_eq!(a.top().title(), "Alpha One");
        let view = render(&mut a, 80, 24);
        assert!(view.contains("╭─ Alpha One · 100%"), "{view}");
        send(&mut a, &["esc"]);
        assert_eq!(a.top().title(), "map");
    }

    #[test]
    fn notes_scroll() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("01_long.md");
        let body: String = (0..60).map(|i| format!("line {i}\n\n")).collect();
        std::fs::write(&path, format!("# Long\n\n{body}")).unwrap();
        let mut sh = shared(Vec::new());
        let mut n = Notes::new(path);
        let first = ui_text(&n, &sh, 80);
        assert!(
            first.contains("Long ·") && !first.contains("100%"),
            "{first}"
        );
        key(&mut sh, &mut n, "G");
        assert!(ui_text(&n, &sh, 80).contains("100%"));
        key(&mut sh, &mut n, "g");
        key(&mut sh, &mut n, "k");
        assert_eq!(
            ui_text(&n, &sh, 80),
            first,
            "scrolling above the top stays at the top"
        );
        let missing = Notes::new(dir.path().join("nope.md"));
        assert!(ui_text(&missing, &sh, 80).contains("nope.md"));
    }

    fn guide_shared() -> (Shared, tempfile::TempDir) {
        let mut sh = shared(vec![placement_skipped(), checkpoint_snoozed()]);
        let dir = tempfile::tempdir().unwrap();
        for (i, title) in ["How to Prepare", "Interview Python"].iter().enumerate() {
            let path = dir.path().join(format!("0{}_note.md", i + 1));
            std::fs::write(&path, format!("# {title}\n\nBody of {title}.\n")).unwrap();
            sh.app.catalog.guide.push(GuideNote {
                title: title.to_string(),
                path,
            });
        }
        (sh, dir)
    }

    #[test]
    fn guide_is_first_row_without_meter() {
        let (sh, _dir) = guide_shared();
        let view = ui_text(&MapScreen::new(), &sh, 80);
        let rows: Vec<&str> = view
            .lines()
            .filter(|l| l.contains("Start here") || l.contains("Alpha"))
            .collect();
        assert_eq!(rows.len(), 2, "{view}");
        assert!(
            rows[0].contains("Start here") && rows[0].contains("2 notes") && !rows[0].contains('%')
        );
    }

    #[test]
    fn guide_opens_notes() {
        let (mut sh, _dir) = guide_shared();
        let mut m = MapScreen::new();
        key(&mut sh, &mut m, "right");
        assert!(ui_text(&m, &sh, 80).contains("Interview Python"));
        key(&mut sh, &mut m, "down");
        match key(&mut sh, &mut m, "enter") {
            Cmd::Push(s) => assert_eq!(s.title(), "Interview Python"),
            _ => panic!("enter on a guide note opens it"),
        }
        for k in ["left", "down", "right"] {
            key(&mut sh, &mut m, k);
        }
        assert!(
            ui_text(&m, &sh, 80).contains("One"),
            "the first module follows Start here"
        );
        let mut fresh = MapScreen::new();
        match key(&mut sh, &mut fresh, "n") {
            Cmd::Push(s) => assert_eq!(s.title(), "How to Prepare"),
            _ => panic!("n on Start here opens its first note"),
        }
    }

    #[test]
    fn guide_wide_previews_selected_note() {
        let (mut sh, _dir) = guide_shared();
        let mut m = MapScreen::new();
        key(&mut sh, &mut m, "right");
        let view = ui_text(&m, &sh, 120);
        assert!(
            view.contains("╭─ start here") && view.contains("How to Prepare"),
            "{view}"
        );
        key(&mut sh, &mut m, "down");
        let view = ui_text(&m, &sh, 120);
        assert!(
            view.contains("Body of Interview Python.") && !view.contains("Body of How to Prepare."),
            "{view}"
        );
        assert_fits(&view, 120, 21);
    }

    #[test]
    fn hides_playlist_only_problems() {
        for w in [80, 120] {
            let view = map_view(Vec::new(), &[], w);
            assert!(
                !view.contains("Problem Bank") && !view.contains("Design"),
                "{view}"
            );
        }
    }

    #[test]
    fn filter_current_column() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["2", "/"]);
        typed(&mut a, "bet");
        let view = render(&mut a, 80, 24);
        assert!(
            view.contains("/ bet") && view.contains("Beta") && !view.contains("Alpha"),
            "{view}"
        );
        assert!(key_bar(&view).contains("esc clear"), "{view}");
        send(&mut a, &["enter"]);
        let view = render(&mut a, 80, 24);
        assert!(
            view.contains("╭─ map › beta"),
            "enter drills into the filtered module:\n{view}"
        );
    }

    #[test]
    fn filter_arrows_stay_on_matches() {
        let mut sh = shared(Vec::new());
        let mut m = MapScreen::new();
        m.start_filter();
        for k in ["b", "down", "down"] {
            key(&mut sh, &mut m, k);
        }
        assert_eq!(m.module(&sh.app.catalog).unwrap().title, "Beta");
        key(&mut sh, &mut m, "z");
        assert!(ui_text(&m, &sh, 80).contains("no matches"));
        assert!(matches!(key(&mut sh, &mut m, "enter"), Cmd::None));
        assert_eq!(m.level, 0);
    }

    #[test]
    fn no_notes_toasts() {
        let mut sh = shared(Vec::new());
        sh.app.catalog.modules[1].notes.clear();
        let mut m = MapScreen::new();
        key(&mut sh, &mut m, "down");
        assert!(matches!(key(&mut sh, &mut m, "n"), Cmd::None));
        assert_eq!(sh.toast_text(), "no notes for Beta");
    }

    #[test]
    fn due_badge_and_palette() {
        let mut sh = shared(passed_events("p-one", 18));
        let mut m = MapScreen::new();
        key(&mut sh, &mut m, "l");
        let lines = m.view(&sh, 120, 21);
        let text = lines.iter().map(ui::plain).collect::<Vec<_>>().join("\n");
        assert!(text.contains(" 1 due "), "{text}");
        assert_palette(&lines);
        let reversed = lines.iter().flat_map(|l| &l.spans).any(|s| {
            s.content.contains("1 due") && s.style.add_modifier.contains(Modifier::REVERSED)
        });
        assert!(reversed, "the due badge is a solid pill");
    }

    #[test]
    fn opens_at_topic() {
        let sh = shared(Vec::new());
        let m = MapScreen::at(&sh.app.catalog, 0, Some(1));
        assert_eq!(m.technique(&sh.app.catalog).unwrap().title, "Two");
        assert!(ui_text(&m, &sh, 80).contains("╭─ map › alpha"));
    }

    #[test]
    fn fits_all_sizes() {
        let (mut sh, _dir) = guide_shared();
        let mut m = MapScreen::new();
        for keys in [&[][..], &["down", "l"], &["l", "l"]] {
            for k in keys {
                key(&mut sh, &mut m, k);
            }
            for w in (60..=160).step_by(7) {
                for h in (17..=37).step_by(5) {
                    let view = ui_text_h(&m, &sh, w, h);
                    assert_fits(&view, w, h);
                }
            }
        }
        let n = Notes::new(sh.app.catalog.modules[0].notes[0].clone());
        for w in (60..=160).step_by(9) {
            assert_fits(&ui_text_h(&n, &sh, w, 20), w, 20);
        }
    }

    fn ui_text_h(s: &dyn Screen, sh: &Shared, w: usize, h: usize) -> String {
        s.view(sh, w, h)
            .iter()
            .map(ui::plain)
            .collect::<Vec<_>>()
            .join("\n")
    }
}
