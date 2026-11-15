//! Search over problems, companies, topics and notes, pushed by `/` and
//! `ctrl+k`.

use std::cell::{Cell, RefCell};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared};
use super::filter;
use super::mapscreen::{MapScreen, Notes};
use super::playlists::{Playlists, playlist_counts};
use super::screens::new_focus;
use super::ui::{self, Key, Lines};
use super::widgets::{
    difficulty_badge, fit_height, glyph, indent, plural, scroll_window, status_of,
};
use crate::catalog::{Catalog, note_title};
use crate::progress::mode;
use crate::schedule::{State, Status};
use crate::session;

const SEARCH_MAX: usize = 200;
const RECENT_LIMIT: usize = 30;

#[derive(Clone, Debug, PartialEq)]
enum Target {
    /// An index into `catalog.problems()`.
    Problem(usize),
    Playlist(usize),
    Module(usize),
    Technique(usize, usize),
    Note {
        path: PathBuf,
        place: String,
    },
}

#[derive(Clone, Debug)]
struct Hit {
    label: String,
    hay: String,
    target: Target,
    /// Byte offsets of matched letters inside the label.
    matched: Vec<usize>,
}

impl Hit {
    fn new(label: impl Into<String>, hay: impl Into<String>, target: Target) -> Hit {
        Hit {
            label: label.into(),
            hay: hay.into(),
            target,
            matched: Vec::new(),
        }
    }

    fn kind(&self) -> &'static str {
        match self.target {
            Target::Problem(_) => "problem",
            Target::Playlist(_) => "company",
            Target::Note { .. } => "note",
            Target::Module(_) | Target::Technique(..) => "topic",
        }
    }
}

pub struct Search {
    query: String,
    cursor: usize,
    offset: Cell<usize>,
    index: Vec<Hit>,
    hays: Vec<String>,
    /// The results and the query they were computed for.
    cache: RefCell<Option<(String, Vec<Hit>)>>,
}

impl Search {
    pub fn new(c: &Catalog) -> Search {
        let mut index = Vec::new();
        for n in &c.guide {
            index.push(Hit::new(
                n.title.clone(),
                format!("{} start here guide", n.title),
                Target::Note {
                    path: n.path.clone(),
                    place: "start here".into(),
                },
            ));
        }
        for (i, p) in c.problems().iter().enumerate() {
            let hay = format!(
                "{} {} {}",
                p.title,
                c.technique_of(p).title,
                c.module_of(p).title
            );
            index.push(Hit::new(p.title.clone(), hay, Target::Problem(i)));
        }
        for (i, pl) in c.playlists.iter().enumerate() {
            index.push(Hit::new(
                pl.title.clone(),
                pl.title.clone(),
                Target::Playlist(i),
            ));
        }
        for (mi, m) in c.modules.iter().enumerate() {
            // Playlist-only problems are searchable as problems, not as a map topic.
            if m.bank {
                continue;
            }
            index.push(Hit::new(
                m.title.clone(),
                m.title.clone(),
                Target::Module(mi),
            ));
            for (ti, t) in m.techniques.iter().enumerate() {
                index.push(Hit::new(
                    t.title.clone(),
                    format!("{} {}", t.title, m.title),
                    Target::Technique(mi, ti),
                ));
            }
            for path in &m.notes {
                let title = note_title(path);
                index.push(Hit::new(
                    title.clone(),
                    format!("{title} {}", m.title),
                    Target::Note {
                        path: path.clone(),
                        place: m.title.clone(),
                    },
                ));
            }
        }
        let hays = index.iter().map(|h| h.hay.clone()).collect();
        Search {
            query: String::new(),
            cursor: 0,
            offset: Cell::new(0),
            index,
            hays,
            cache: RefCell::new(None),
        }
    }

    fn results(&self, sh: &Shared) -> Vec<Hit> {
        if let Some((q, hits)) = self.cache.borrow().as_ref() {
            if *q == self.query {
                return hits.clone();
            }
        }
        let q = self.query.trim();
        let hits = if q.is_empty() {
            self.suggestions(sh)
        } else if q.chars().all(|c| c.is_ascii_digit()) {
            self.by_number(sh, q)
        } else {
            self.fuzzy(q)
        };
        *self.cache.borrow_mut() = Some((self.query.clone(), hits.clone()));
        hits
    }

    /// Today's queue, then recently practiced problems.
    fn suggestions(&self, sh: &Shared) -> Vec<Hit> {
        let a = &sh.app;
        let c = &a.catalog;
        let states = a.states();
        let mut seen = HashSet::new();
        let mut out = Vec::new();
        let mut push = |i: usize| {
            if seen.insert(i) {
                out.push(Hit::new(
                    c.problems()[i].title.clone(),
                    "",
                    Target::Problem(i),
                ));
            }
        };
        let index_of = |id: &str| c.problems().iter().position(|p| p.id == id);
        let today = session::today(c, states, (a.now)(), &a.tz, a.config.new_per_day, &a.events);
        for it in today {
            if let Some(i) = index_of(&it.problem.id) {
                push(i);
            }
        }
        let mut recent: Vec<usize> = (0..c.problems().len())
            .filter(|&i| {
                states
                    .get(&c.problems()[i].id)
                    .is_some_and(|st| st.status != Status::Unseen)
            })
            .collect();
        let finished = |i: usize| {
            states
                .get(&c.problems()[i].id)
                .and_then(|st| st.last_finished)
        };
        recent.sort_by_key(|&x| std::cmp::Reverse(finished(x)));
        for i in recent.into_iter().take(RECENT_LIMIT) {
            push(i);
        }
        out
    }

    fn by_number(&self, sh: &Shared, q: &str) -> Vec<Hit> {
        let problems = sh.app.catalog.problems();
        let mut out: Vec<Hit> = self
            .index
            .iter()
            .filter(|h| match h.target {
                Target::Problem(i) => {
                    let n = problems[i].leetcode;
                    n > 0 && n.to_string().starts_with(q)
                }
                _ => false,
            })
            .cloned()
            .collect();
        let number = |h: &Hit| match h.target {
            Target::Problem(i) => problems[i].leetcode,
            _ => 0,
        };
        out.sort_by_key(number);
        out.truncate(SEARCH_MAX);
        out
    }

    /// Ranks exact label matches, then label prefixes, then everything else by fuzzy score.
    fn fuzzy(&self, q: &str) -> Vec<Hit> {
        let lower = q.to_lowercase();
        let tier = |label: &str| {
            let l = label.to_lowercase();
            if l == lower {
                0
            } else if l.starts_with(&lower) {
                1
            } else {
                2
            }
        };
        let n = q.chars().count();
        let mut ranked: Vec<(Hit, i32, i64)> = filter::find(q, &self.hays)
            .into_iter()
            .filter(|m| compact(&self.hays[m.index], &m.matched, n))
            .map(|m| {
                let mut h = self.index[m.index].clone();
                h.matched = m
                    .matched
                    .iter()
                    .copied()
                    .filter(|&i| i < h.label.len())
                    .collect();
                let t = tier(&h.label);
                (h, t, m.score)
            })
            .collect();
        ranked.sort_by(|x, y| x.1.cmp(&y.1).then(y.2.cmp(&x.2)));
        ranked.into_iter().take(SEARCH_MAX).map(|r| r.0).collect()
    }

    fn open(&self, sh: &mut Shared, h: &Hit) -> Cmd {
        let screen: Box<dyn Screen> = match &h.target {
            Target::Problem(i) => {
                let id = sh.app.catalog.problems()[*i].id.clone();
                new_focus(sh, &id, mode::PRACTICE)
            }
            Target::Playlist(i) => Box::new(Playlists::opened(&sh.app.catalog, *i)),
            Target::Note { path, .. } => Box::new(Notes::new(path.clone())),
            Target::Module(m) => Box::new(MapScreen::at(&sh.app.catalog, *m, None)),
            Target::Technique(m, t) => Box::new(MapScreen::at(&sh.app.catalog, *m, Some(*t))),
        };
        Cmd::Jump(screen)
    }

    fn meta(&self, sh: &Shared, h: &Hit, states: &HashMap<String, State>) -> Line<'static> {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let muted = |s: String| Span::styled(s, th.muted);
        let spans = match &h.target {
            Target::Problem(i) => {
                let p = &c.problems()[*i];
                let tech = c.technique_of(p).title.to_lowercase();
                let module = c.module_of(p);
                let place = if module.bank {
                    format!("playlist · {tech}")
                } else {
                    format!("{} · {tech}", module.title.to_lowercase())
                };
                let place = ui::truncate(Line::from(place), 28);
                vec![
                    Span::raw(" "),
                    muted(ui::plain(&place)),
                    Span::raw(" "),
                    difficulty_badge(th, p.difficulty),
                ]
            }
            Target::Playlist(i) => {
                let (m, t, _) = playlist_counts(c, &c.playlists[*i], states);
                vec![Span::raw(" "), muted(format!("{m}/{t} mastered"))]
            }
            Target::Note { place, .. } => vec![Span::raw(" "), muted(place.to_lowercase())],
            Target::Technique(m, t) => {
                let module = &c.modules[*m];
                let n = module.techniques[*t].problems.len() as i64;
                vec![
                    Span::raw(" "),
                    muted(format!(
                        "{} · {}",
                        module.title.to_lowercase(),
                        plural(n, "problem", "problems")
                    )),
                ]
            }
            Target::Module(m) => {
                let n: usize = c.modules[*m]
                    .techniques
                    .iter()
                    .map(|t| t.problems.len())
                    .sum();
                vec![
                    Span::raw(" "),
                    muted(format!(
                        "module · {}",
                        plural(n as i64, "problem", "problems")
                    )),
                ]
            }
        };
        Line::from(spans)
    }

    fn row(
        &self,
        sh: &Shared,
        h: &Hit,
        selected: bool,
        states: &HashMap<String, State>,
        inner: usize,
    ) -> Line<'static> {
        let th = &sh.theme;
        let (marker, base, hl) = if selected {
            (
                Span::styled("▸ ", th.accent),
                th.selected,
                th.selected.add_modifier(Modifier::UNDERLINED),
            )
        } else {
            (
                Span::raw("  "),
                Style::new(),
                th.accent.add_modifier(Modifier::UNDERLINED),
            )
        };
        let lead = match h.target {
            Target::Problem(i) => {
                let id = &sh.app.catalog.problems()[i].id;
                vec![glyph(th, status_of(states, id).status), Span::raw(" ")]
            }
            _ => vec![Span::raw("  ")],
        };
        let tag = if inner >= 60 {
            Span::styled(format!("{:<8}", h.kind()), th.muted)
        } else {
            Span::raw("")
        };
        let meta = self.meta(sh, h, states);
        let label_w = inner
            .saturating_sub(2 + tag.width() + 2 + meta.width())
            .max(6);
        let label = ui::pad(highlight(&h.label, &h.matched, base, hl), label_w);
        let mut spans = vec![marker, tag];
        spans.extend(lead);
        spans.extend(label.spans);
        spans.extend(meta.spans);
        ui::pad(Line::from(spans), inner)
    }
}

/// Rejects matches whose letters are scattered through words. A match starts at
/// a word (or with three letters in a row), and every later run of letters starts a word,
/// except one run for queries of four or more letters: "strp" still finds Stripe, "lru"
/// no longer finds Liberty Mutual.
fn compact(hay: &str, idx: &[usize], n: usize) -> bool {
    if n <= 1 || idx.is_empty() {
        return true;
    }
    let bytes = hay.as_bytes();
    let word_start = |i: usize| i == 0 || b" -(/".contains(&bytes[i - 1]);
    let mut first_run = 1;
    while first_run < idx.len() && idx[first_run] == idx[first_run - 1] + 1 {
        first_run += 1;
    }
    if !word_start(idx[0]) && first_run < 3 {
        return false;
    }
    let mut allowed = usize::from(n >= 4);
    for i in first_run..idx.len() {
        if idx[i] == idx[i - 1] + 1 || word_start(idx[i]) {
            continue;
        }
        if allowed == 0 {
            return false;
        }
        allowed -= 1;
    }
    true
}

/// The label with the letters at byte offsets idx in hl and the rest in base.
fn highlight(label: &str, idx: &[usize], base: Style, hl: Style) -> Line<'static> {
    let mut spans: Vec<Span<'static>> = Vec::new();
    let mut run = String::new();
    let mut run_on = false;
    for (i, c) in label.char_indices() {
        let on = idx.contains(&i);
        if on != run_on && !run.is_empty() {
            spans.push(Span::styled(
                std::mem::take(&mut run),
                if run_on { hl } else { base },
            ));
        }
        run_on = on;
        run.push(c);
    }
    if !run.is_empty() {
        spans.push(Span::styled(run, if run_on { hl } else { base }));
    }
    Line::from(spans)
}

impl Screen for Search {
    fn title(&self) -> String {
        "search".into()
    }

    fn kind(&self) -> Kind {
        Kind::Search
    }

    fn owns_key(&self, key: &str) -> bool {
        key == "space" || key == "backspace" || key.chars().count() == 1
    }

    fn keys(&self) -> Vec<Key> {
        vec![
            Key::new("↑/↓", "move"),
            Key::new("enter", "open"),
            Key::new("esc", "back"),
        ]
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        match k.name.as_str() {
            "esc" => return Cmd::Pop,
            "enter" => {
                if let Some(h) = self.results(sh).get(self.cursor) {
                    return self.open(sh, h);
                }
            }
            "down" | "ctrl+n" => {
                let n = self.results(sh).len();
                self.cursor = (self.cursor + 1).min(n.saturating_sub(1));
            }
            "up" | "ctrl+p" => self.cursor = self.cursor.saturating_sub(1),
            "backspace" => {
                self.query.pop();
                self.reset_cursor();
            }
            "space" => {
                self.query.push(' ');
                self.reset_cursor();
            }
            _ => {
                if let Some(c) = k.text() {
                    self.query.push(c);
                    self.reset_cursor();
                }
            }
        }
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let states = sh.app.states();
        let card_w = w.saturating_sub(4);
        let inner = card_w.saturating_sub(4);
        let visible = h.saturating_sub(5).max(1);
        let mut body = vec![
            Line::from(vec![
                Span::styled("/ ", th.accent),
                Span::raw(self.query.clone()),
                Span::styled("█", th.muted),
            ]),
            Line::default(),
        ];
        let res = self.results(sh);
        if res.is_empty() {
            body.push(Line::from(Span::styled(
                format!("no matches for {:?}", self.query),
                th.muted,
            )));
        }
        let offset = scroll_window(self.cursor, self.offset.get(), visible);
        self.offset.set(offset);
        for (i, hit) in res.iter().enumerate().skip(offset).take(visible) {
            body.push(self.row(sh, hit, i == self.cursor, states, inner));
        }
        let title = if res.len() > visible {
            format!("search · {} results", res.len())
        } else {
            "search".into()
        };
        let body = fit_height(body, h.saturating_sub(3).max(1));
        let mut out = vec![Line::default()];
        out.extend(indent(ui::card(th, &title, body, card_w, true), 2));
        out
    }
}

impl Search {
    fn reset_cursor(&mut self) {
        self.cursor = 0;
        self.offset.set(0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tui::app::KeyPress;
    use crate::tui::browse_testing::*;
    use crate::tui::theme::assert_palette;

    fn searched(q: &str) -> (Shared, Search) {
        let sh = shared(vec![placement_skipped(), checkpoint_snoozed()]);
        let mut s = Search::new(&sh.app.catalog);
        s.query = q.into();
        (sh, s)
    }

    fn problem_ids(sh: &Shared, hits: &[Hit]) -> Vec<String> {
        hits.iter()
            .filter_map(|h| match h.target {
                Target::Problem(i) => Some(sh.app.catalog.problems()[i].id.clone()),
                _ => None,
            })
            .collect()
    }

    fn enter(sh: &mut Shared, s: &mut Search) -> Box<dyn Screen> {
        match s.update(sh, &Msg::Key(KeyPress::named("enter"))) {
            Cmd::Jump(screen) => screen,
            _ => panic!("enter should jump out of search"),
        }
    }

    fn text(s: &dyn Screen, sh: &Shared, w: usize, h: usize) -> String {
        s.view(sh, w, h)
            .iter()
            .map(ui::plain)
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn finds_by_title_technique_and_number() {
        let (sh, s) = searched("two sum");
        assert_eq!(
            problem_ids(&sh, &s.results(&sh))
                .first()
                .map(String::as_str),
            Some("two-sum")
        );
        let (sh, s) = searched("one");
        let got = problem_ids(&sh, &s.results(&sh));
        let mut first: Vec<&str> = got.iter().take(2).map(String::as_str).collect();
        first.sort();
        assert_eq!(first, ["p-one", "p-two"], "{got:?}");
        let (sh, s) = searched("359");
        assert_eq!(
            problem_ids(&sh, &s.results(&sh))
                .first()
                .map(String::as_str),
            Some("logger-rate-limiter")
        );
    }

    #[test]
    fn company_opens_playlist() {
        let (mut sh, mut s) = searched("meta");
        assert!(matches!(s.results(&sh)[0].target, Target::Playlist(_)));
        let screen = enter(&mut sh, &mut s);
        assert_eq!(screen.title(), "Meta");
        assert_eq!(screen.tab(), Some(3));
    }

    #[test]
    fn topic_opens_map() {
        let (mut sh, mut s) = searched("three");
        assert!(matches!(s.results(&sh)[0].target, Target::Technique(..)));
        let screen = enter(&mut sh, &mut s);
        assert_eq!(screen.tab(), Some(1));
        let view = text(screen.as_ref(), &sh, 80, 21);
        assert!(
            view.contains("╭─ map › beta") && view.contains("▸ Three"),
            "{view}"
        );
    }

    #[test]
    fn note_opens_notes() {
        let (mut sh, mut s) = searched("alpha one");
        assert!(
            matches!(&s.results(&sh)[0].target, Target::Note { path, .. } if path.ends_with("01_a.md"))
        );
        assert_eq!(enter(&mut sh, &mut s).title(), "Alpha One");
    }

    #[test]
    fn problem_opens_focus() {
        let (mut sh, mut s) = searched("two sum");
        let screen = enter(&mut sh, &mut s);
        assert!(screen.kind() == Kind::Focus && screen.title().contains("Two Sum"));
    }

    #[test]
    fn empty_query_shows_today() {
        let (sh, s) = searched("");
        let a = &sh.app;
        let today = session::today(
            &a.catalog,
            a.states(),
            (a.now)(),
            &a.tz,
            a.config.new_per_day,
            &a.events,
        );
        let got = problem_ids(&sh, &s.results(&sh));
        assert!(!today.is_empty() && got.len() >= today.len(), "{got:?}");
        for (i, it) in today.iter().enumerate() {
            assert_eq!(got[i], it.problem.id);
        }
    }

    #[test]
    fn rows_show_kind_and_palette() {
        let (sh, s) = searched("e");
        let lines = s.view(&sh, 80, 21);
        let view = lines.iter().map(ui::plain).collect::<Vec<_>>().join("\n");
        for kind in ["problem", "company", "topic", "note"] {
            assert!(view.contains(kind), "{kind}:\n{view}");
        }
        assert_palette(&lines);
    }

    #[test]
    fn highlight_marks_matches() {
        let th = crate::tui::theme::Theme::new();
        let out = highlight(
            "Two Sum",
            &[0, 4],
            th.title,
            th.accent.add_modifier(Modifier::UNDERLINED),
        );
        assert_eq!(ui::plain(&out), "Two Sum");
        let underlined: String = out
            .spans
            .iter()
            .filter(|s| s.style.add_modifier.contains(Modifier::UNDERLINED))
            .map(|s| s.content.as_ref())
            .collect();
        assert_eq!(underlined, "TS");
    }

    #[test]
    fn typing_and_backspace_through_the_frame() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["/"]);
        typed(&mut a, "q?/");
        assert!(!a.should_quit() && a.top().kind() == Kind::Search);
        let view = render(&mut a, 80, 24);
        assert!(view.contains("/ q?/█"), "{view}");
        send(&mut a, &["backspace"]);
        assert!(render(&mut a, 80, 24).contains("/ q?█"));
    }

    #[test]
    fn card_and_no_matches() {
        let (sh, s) = searched("two");
        let view = text(&s, &sh, 80, 21);
        assert!(
            view.contains("╭─ search") && view.contains("/ two"),
            "{view}"
        );
        let (sh, s) = searched("zzzz");
        assert!(text(&s, &sh, 80, 21).contains(r#"no matches for "zzzz""#));
    }

    #[test]
    fn cursor_moves_and_scrolls() {
        let (mut sh, mut s) = searched("e");
        let n = s.results(&sh).len();
        for _ in 0..n + 3 {
            s.update(&mut sh, &Msg::Key(KeyPress::named("down")));
        }
        assert_eq!(s.cursor, n - 1);
        let view = text(&s, &sh, 80, 8);
        assert!(
            view.contains("search · ") && view.contains("results") && view.contains('▸'),
            "{view}"
        );
        s.update(&mut sh, &Msg::Key(KeyPress::named("ctrl+p")));
        assert_eq!(s.cursor, n - 2);
    }

    #[test]
    fn compact_rejects_scattered_letters() {
        assert!(
            compact("Stripe", &[0, 1, 2, 4], 4),
            "one gap is allowed at four letters"
        );
        assert!(!compact("Liberty Mutual", &[0, 7, 13], 3));
        assert!(compact("LRU Cache", &[0, 1, 2], 3));
        assert!(
            compact("abc def", &[1, 2, 3], 3),
            "three in a row may start mid-word"
        );
        assert!(!compact("abc def", &[1, 2], 2));
    }

    #[test]
    fn ctrl_k_opens_search_on_list_tabs() {
        for tab in ["1", "2", "4", "5"] {
            let mut a = app_with(Vec::new());
            send(&mut a, &[tab, "ctrl+k"]);
            assert_eq!(a.top().kind(), Kind::Search, "tab {tab}");
        }
        let mut a = app_with(Vec::new());
        send(&mut a, &["2"]);
        let bar = key_bar(&render(&mut a, 80, 24));
        assert!(
            bar.contains("/ filter") && !bar.contains("/ search"),
            "{bar}"
        );
    }

    #[test]
    fn golden_80x24() {
        let mut a = app_with(Vec::new());
        send(&mut a, &["/"]);
        typed(&mut a, "p");
        assert_golden(&golden("search"), &render(&mut a, 80, 24));
    }

    #[test]
    fn real_catalog() {
        let Ok(c) = crate::catalog::load(std::path::Path::new(env!("CARGO_MANIFEST_DIR"))) else {
            return;
        };
        let mut sh = shared(Vec::new());
        sh.app.catalog = c;
        let mut s = Search::new(&sh.app.catalog);
        let q = |s: &mut Search, q: &str| {
            s.query = q.into();
            s.results(&sh)
        };
        let first = |sh: &Shared, hits: &[Hit]| problem_ids(sh, hits).first().cloned();
        let hits = q(&mut s, "koko");
        assert_eq!(first(&sh, &hits).as_deref(), Some("koko-eating-bananas"));
        let hits = q(&mut s, "146");
        assert_eq!(first(&sh, &hits).as_deref(), Some("lru-cache"));
        let hits = q(&mut s, "strp");
        assert!(
            matches!(hits[0].target, Target::Playlist(i) if sh.app.catalog.playlists[i].title == "Stripe")
        );
        for h in q(&mut s, "lru") {
            assert!(
                h.label == "LRU Cache" || h.hay.to_lowercase().contains("lru"),
                "lru matched scattered letters in {:?}",
                h.label
            );
        }
        s.query = "a".into();
        let rows = text(&s, &sh, 100, 40).matches("problem").count();
        assert!(rows > 12, "results should fill the screen, got {rows}");
    }

    #[test]
    fn fits_all_sizes() {
        let (sh, s) = searched("a");
        for w in (60..=160).step_by(7) {
            for h in (17..=37).step_by(5) {
                assert_fits(&text(&s, &sh, w, h), w, h);
            }
        }
    }
}
