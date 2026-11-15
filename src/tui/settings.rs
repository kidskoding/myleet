use std::cell::Cell;

use jiff::{SignedDuration, ToSpan};
use ratatui::style::Modifier;
use ratatui::text::{Line, Span};

use super::app::{Cmd, Msg, Screen, Shared};
use super::ui::{self, Key, Lines, Tone};
use super::widgets::{fit_height, indent, mmss, plural, scroll_window};
use crate::catalog::Difficulty;
use crate::schedule::{Outcome, local_day};
use crate::stats::{self, Summary};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Section {
    Overview,
    Heatmap,
    Hint,
    Weak,
    Reset,
}

#[derive(Default)]
pub struct Settings {
    cursor: usize,
    offset: Cell<usize>,
    /// Whether the cursor is on the reset section, for the key bar (keys() has no Shared).
    on_reset: Cell<bool>,
    /// 0 idle, 1 first confirm, 2 final confirm.
    confirm: u8,
}

fn sections(sum: &Summary, finished: usize) -> Vec<Section> {
    let mut out = vec![Section::Overview, Section::Heatmap];
    if finished == 0 {
        out.push(Section::Hint);
    }
    if !sum.weakest.is_empty() {
        out.push(Section::Weak);
    }
    out.push(Section::Reset);
    out
}

fn summary(sh: &Shared) -> (Summary<'_>, usize) {
    let a = &sh.app;
    let attempts = a.attempts();
    let sum = stats::compute(&a.catalog, a.states(), &attempts, (a.now)(), &a.tz);
    let finished = attempts
        .iter()
        .filter(|x| x.outcome != Outcome::None)
        .count();
    (sum, finished)
}

fn target(d: Difficulty) -> SignedDuration {
    SignedDuration::try_from(d.default_time_target()).unwrap_or(SignedDuration::ZERO)
}

impl Settings {
    pub fn new() -> Settings {
        Settings::default()
    }

    fn heatmap(&self, sh: &Shared, sum: &Summary, width: usize) -> (Lines, usize) {
        let th = &sh.theme;
        let weeks = ((width as i64 - 6) / 2).clamp(8, 52) as usize;
        let today = local_day((sh.app.now)(), &sh.app.tz);
        let monday = today
            .checked_sub(i64::from(today.weekday().to_monday_zero_offset()).days())
            .unwrap_or(today);
        let first = monday
            .checked_sub((7 * (weeks as i64 - 1)).days())
            .unwrap_or(monday);
        let labels = ["mon", "", "wed", "", "fri", "", "sun"];
        let rows = (0..7)
            .map(|wd| {
                let mut spans = vec![Span::raw(format!("{:<4}", labels[wd]))];
                for week in 0..weeks {
                    let day = first
                        .checked_add(((week * 7 + wd) as i64).days())
                        .unwrap_or(first);
                    if day > today {
                        spans.push(Span::raw("  "));
                        continue;
                    }
                    let cell = match sum.heatmap.get(&day).copied().unwrap_or(0) {
                        0 => Span::styled("·", th.muted),
                        1 => Span::styled("▪", th.muted),
                        2..=3 => Span::styled("▪", th.due),
                        _ => Span::styled("▪", th.pass),
                    };
                    spans.push(cell);
                    spans.push(Span::raw(" "));
                }
                Line::from(spans)
            })
            .collect();
        (rows, weeks)
    }

    fn median(&self, sh: &Shared, sum: &Summary) -> Vec<Span<'static>> {
        let th = &sh.theme;
        for d in [Difficulty::Medium, Difficulty::Easy, Difficulty::Hard] {
            if let Some(&m) = sum.median_by_diff.get(&d) {
                let style = if m > target(d) { th.fail } else { th.pass };
                return vec![
                    Span::styled(mmss(m), style),
                    Span::styled(format!(" vs {} {}", mmss(target(d)), d.short()), th.muted),
                ];
            }
        }
        vec![Span::styled("no passes yet", th.muted)]
    }

    fn card(&self, sh: &Shared, sum: &Summary, kind: Section, width: usize, active: bool) -> Lines {
        let th = &sh.theme;
        let t = |s: String| Span::styled(s, th.title);
        match kind {
            Section::Overview => {
                let mut median = vec![t("Median".into()), Span::raw("    ")];
                median.extend(self.median(sh, sum));
                let body = vec![
                    Line::from(vec![
                        t("Streak".into()),
                        Span::raw("    "),
                        t(plural(sum.streak as i64, "day", "days")),
                    ]),
                    Line::from(vec![
                        t("Mastered".into()),
                        Span::raw("  "),
                        t(format!("{} / {}", sum.mastery[0], sum.mastery[1])),
                    ]),
                    Line::from(median),
                ];
                ui::card(th, "overview", body, width, active)
            }
            Section::Heatmap => {
                let (heat, weeks) = self.heatmap(sh, sum, width.saturating_sub(4));
                ui::card(th, &format!("last {weeks} weeks"), heat, width, active)
            }
            Section::Hint => {
                let note = "No attempts yet. Finish a problem from your practice queue (1) to start your streak.\nYour weakest techniques show up here after a few attempts.";
                let body: Lines = note
                    .lines()
                    .map(|l| Line::from(Span::styled(l.to_string(), th.muted)))
                    .collect();
                ui::card(th, "getting started", body, width, active)
            }
            Section::Weak => {
                let rows: Lines = sum
                    .weakest
                    .iter()
                    .map(|ws| {
                        let name =
                            format!("{} · {}", ws.module.title, ws.technique.title).to_lowercase();
                        let mut spans = ui::pad(Line::from(name), 34).spans;
                        spans.push(Span::raw(" "));
                        spans.extend(ui::bar(th, ws.fail_rate, 16, Tone::Fail).spans);
                        spans.push(Span::styled(
                            format!(
                                "  fail {:.0}% · hint {:.0}%",
                                ws.fail_rate * 100.0,
                                ws.hint_rate * 100.0
                            ),
                            th.muted,
                        ));
                        Line::from(spans)
                    })
                    .collect();
                ui::card(th, "weakest techniques", rows, width, active)
            }
            Section::Reset => {
                let item = if active {
                    vec![
                        Span::styled("▸ ", th.fail),
                        Span::styled(
                            " Reset all progress ",
                            th.fail.add_modifier(Modifier::BOLD | Modifier::REVERSED),
                        ),
                    ]
                } else {
                    vec![Span::raw("  "), Span::styled("Reset all progress", th.fail)]
                };
                let body = vec![
                    Line::from(item),
                    Line::default(),
                    Line::from(Span::styled(
                        "Want a clean slate? Press enter, then confirm with y twice.",
                        th.muted,
                    )),
                ];
                ui::card(th, "danger zone", body, width, active)
            }
        }
    }

    fn confirm_view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let y = Span::styled("y", th.fail.add_modifier(Modifier::BOLD));
        let n = Span::styled("n", th.muted);
        let (title, mut body, yes, no) = if self.confirm == 1 {
            (
                "start fresh?",
                vec![
                    Line::from("This will wipe your save file, history, and practice attempts."),
                    Line::from(
                        "Cached problem statements stay. You will see the placement warm-up again.",
                    ),
                ],
                " continue    ",
                " never mind",
            )
        } else {
            (
                "really wipe everything?",
                vec![Line::from(
                    "This is your last chance. Press y to erase everything. This cannot be undone.",
                )],
                " erase everything    ",
                " keep my progress",
            )
        };
        body.push(Line::default());
        body.push(Line::from(vec![y, Span::raw(yes), n, Span::raw(no)]));
        ui::modal_tone(th, title, body, w, h, Tone::Fail)
    }
}

impl Screen for Settings {
    fn title(&self) -> String {
        "stats".into()
    }

    fn tab(&self) -> Option<usize> {
        Some(4)
    }

    fn help(&self) -> Lines {
        [
            "↑/↓ j/k        move between sections",
            "pgup/pgdn      jump by a few sections",
            "g/G            top / bottom",
            "enter          reset (confirm with y twice)",
        ]
        .into_iter()
        .map(Line::from)
        .collect()
    }

    fn owns_key(&self, key: &str) -> bool {
        self.confirm > 0 && matches!(key, "y" | "n" | "esc")
    }

    fn keys(&self) -> Vec<Key> {
        if self.confirm > 0 {
            return vec![Key::new("y", "confirm"), Key::new("n", "cancel")];
        }
        let mut keys = vec![Key::new("↑/↓", "move"), Key::new("pgup/pgdn", "page")];
        if self.on_reset.get() {
            keys.insert(0, Key::new("enter", "select"));
        }
        keys
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        let key = k.name.as_str();
        if self.confirm > 0 {
            match key {
                "y" if self.confirm == 1 => self.confirm = 2,
                "y" => {
                    match sh.app.reset_progress() {
                        Ok(()) => {
                            sh.toast("Progress cleared. Welcome back. We will warm up again when you return.");
                            self.cursor = 0;
                            self.offset.set(0);
                            self.on_reset.set(false);
                        }
                        Err(e) => sh.toast(format!("reset failed: {e}")),
                    }
                    self.confirm = 0;
                }
                "n" | "esc" => self.confirm = 0,
                _ => {}
            }
            return Cmd::None;
        }
        let (sum, finished) = summary(sh);
        let secs = sections(&sum, finished);
        let last = secs.len() - 1;
        self.cursor = self.cursor.min(last);
        let page = last.clamp(1, 2);
        match key {
            "esc" => return Cmd::Pop,
            "j" | "down" => self.cursor = (self.cursor + 1).min(last),
            "k" | "up" => self.cursor = self.cursor.saturating_sub(1),
            "ctrl+d" | "pgdown" => self.cursor = (self.cursor + page).min(last),
            "ctrl+u" | "pgup" => self.cursor = self.cursor.saturating_sub(page),
            "g" | "home" => self.cursor = 0,
            "G" | "end" => self.cursor = last,
            "enter" if secs[self.cursor] == Section::Reset => self.confirm = 1,
            _ => {}
        }
        self.on_reset.set(secs[self.cursor] == Section::Reset);
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        if self.confirm > 0 {
            return self.confirm_view(sh, w, h);
        }
        let card_w = w.saturating_sub(4);
        let (sum, finished) = summary(sh);
        let secs = sections(&sum, finished);
        let cursor = self.cursor.min(secs.len() - 1);
        self.on_reset.set(secs[cursor] == Section::Reset);
        let height = h.saturating_sub(1).max(1);
        let mut starts = Vec::with_capacity(secs.len());
        let mut lines: Lines = vec![Line::default()];
        for (i, &kind) in secs.iter().enumerate() {
            starts.push(lines.len());
            lines.extend(indent(self.card(sh, &sum, kind, card_w, i == cursor), 2));
        }
        let offset = scroll_window(starts[cursor], self.offset.get(), height)
            .min(lines.len().saturating_sub(height));
        self.offset.set(offset);
        let end = (offset + height).min(lines.len());
        fit_height(lines[offset..end].to_vec(), height)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Event;
    use crate::tui::app::{KeyPress, Kind};
    use crate::tui::browse_testing::*;
    use crate::tui::theme::assert_palette;

    fn history(extra: &[(&str, i64)]) -> Vec<Event> {
        let mut events: Vec<Event> = [1, 2, 5, 12, 18]
            .iter()
            .flat_map(|&d| passed_events("two-sum", d))
            .collect();
        for &(id, d) in extra {
            events.extend(passed_events(id, d));
        }
        events
    }

    fn stats_app(events: Vec<Event>) -> crate::tui::App {
        let mut a = crate::tui::App::new(shared(events));
        send(&mut a, &["5"]);
        a
    }

    #[test]
    fn empty_shows_getting_started() {
        let mut a = stats_app(Vec::new());
        let view = render(&mut a, 80, 24);
        assert!(view.contains("No attempts yet"), "{view}");
        let view = render(&mut a, 80, 40);
        for want in ["╭─ overview", "╭─ last ", "No attempts yet"] {
            assert!(view.contains(want), "{want}:\n{view}");
        }
        assert!(!view.contains("╭─ progress"));
        send(&mut a, &["G"]);
        assert!(render(&mut a, 80, 40).contains("danger zone"));
    }

    #[test]
    fn golden_80x24() {
        let mut a = stats_app(history(&[("p-one", 18), ("p-two", 19)]));
        let view = render(&mut a, 80, 24);
        assert!(view.contains("2 days") && view.contains("1 / 4"), "{view}");
        assert_fits(&view, 80, 24);
        assert_golden(&golden("settings"), &view);
    }

    #[test]
    fn golden_wide() {
        let mut a = stats_app(history(&[("p-one", 18)]));
        let view = render(&mut a, 120, 32);
        for want in [
            "╭─ overview",
            "Streak",
            "Mastered",
            "Median",
            "╭─ last ",
            " weeks ─",
        ] {
            assert!(view.contains(want), "{want}:\n{view}");
        }
        assert_golden(&golden("settings_wide"), &view);
    }

    #[test]
    fn weakest_section_and_median_colors() {
        let mut events = Vec::new();
        for d in [16, 17, 18] {
            let mut evs = passed_events("p-two", d);
            evs[1].kind = crate::progress::kind::GAVE_UP.into();
            events.extend(evs);
        }
        let sh = shared(events);
        let st = Settings::new();
        let lines = st.view(&sh, 100, 60);
        let view = lines.iter().map(ui::plain).collect::<Vec<_>>().join("\n");
        assert!(
            view.contains("weakest techniques") && view.contains("alpha · one"),
            "{view}"
        );
        assert!(view.contains("fail 100%"), "{view}");
        assert_palette(&lines);
    }

    #[test]
    fn enter_only_resets_from_danger_zone() {
        let mut a = stats_app(Vec::new());
        send(&mut a, &["enter"]);
        assert_eq!(a.top().title(), "stats");
        assert!(!render(&mut a, 80, 40).contains("start fresh?"));
        assert!(!key_bar(&render(&mut a, 80, 40)).contains("enter select"));
        send(&mut a, &["G"]);
        assert!(key_bar(&render(&mut a, 80, 40)).contains("enter select"));
        send(&mut a, &["enter"]);
        assert!(render(&mut a, 80, 40).contains("start fresh?"));
    }

    #[test]
    fn reset_is_red_and_confirms_twice() {
        let mut sh = shared(vec![placement_skipped()]);
        let mut st = Settings::new();
        let key = |sh: &mut Shared, st: &mut Settings, k: &str| {
            st.update(sh, &Msg::Key(KeyPress::named(k)));
        };
        key(&mut sh, &mut st, "G");
        let lines = st.view(&sh, 80, 39);
        let red = lines.iter().flat_map(|l| &l.spans).any(|s| {
            s.content.contains("Reset all progress")
                && s.style.fg == sh.theme.fail.fg
                && s.style.add_modifier.contains(Modifier::REVERSED)
        });
        assert!(red, "the selected reset item is a solid red pill");
        key(&mut sh, &mut st, "enter");
        let lines = st.view(&sh, 80, 21);
        let text = lines.iter().map(ui::plain).collect::<Vec<_>>().join("\n");
        assert!(text.contains("start fresh?"), "{text}");
        assert!(
            lines
                .iter()
                .flat_map(|l| &l.spans)
                .any(|s| s.content == "y" && s.style.fg == sh.theme.fail.fg)
        );
        assert_palette(&lines);
        assert!(st.owns_key("n") && !st.owns_key("q"));
        key(&mut sh, &mut st, "y");
        let text: String = st.view(&sh, 80, 21).iter().map(ui::plain).collect();
        assert!(text.contains("really wipe everything?"), "{text}");
        key(&mut sh, &mut st, "n");
        assert_eq!(
            (st.confirm, sh.app.events.len()),
            (0, 1),
            "cancel keeps progress"
        );
    }

    #[test]
    fn reset_clears_progress() {
        let mut events = vec![placement_skipped()];
        events.extend(passed_events("p-one", 18));
        let mut a = stats_app(events);
        let path = a.sh.app.workspace.attempt_path("p-one");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, "x = 1\n").unwrap();
        send(&mut a, &["G", "enter", "y", "y"]);
        assert!(a.sh.app.events.is_empty());
        assert!(!path.exists(), "attempt files are wiped");
        assert!(crate::placement::needs(
            &a.sh.app.events,
            &a.sh.app.attempts()
        ));
        assert!(a.sh.toast_text().starts_with("Progress cleared"));
        send(&mut a, &["G"]);
        assert!(render(&mut a, 80, 24).contains("danger zone"));
        assert_eq!(a.top().kind(), Kind::Other);
    }

    #[test]
    fn slash_opens_search_and_paging() {
        let mut a = stats_app(Vec::new());
        assert!(key_bar(&render(&mut a, 80, 24)).contains("/ search"));
        send(&mut a, &["pgdown", "pgdown", "pgup"]);
        send(&mut a, &["/"]);
        assert_eq!(a.top().kind(), Kind::Search);
    }

    #[test]
    fn fits_all_sizes() {
        let sh = shared(history(&[("p-one", 18)]));
        let mut st = Settings::new();
        for confirm in [0, 1, 2] {
            st.confirm = confirm;
            for w in (60..=160).step_by(7) {
                for h in (17..=37).step_by(5) {
                    let view: Vec<String> = st.view(&sh, w, h).iter().map(ui::plain).collect();
                    assert_fits(&view.join("\n"), w, h);
                }
            }
        }
    }
}
