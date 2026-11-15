//! The Today tab: the personalized queue, progress, check-ins, and the
//! first-run placement gate. Ported from internal/tui/home.go.

use std::cell::Cell;
use std::collections::HashMap;

use jiff::{Timestamp, ToSpan};
use ratatui::text::{Line, Span};

use super::app::{Cmd, Kind, Msg, Screen, Shared};
use super::placement::Placement;
use super::screens;
use super::ui::{self, BadgeKind, Key, Lines, Tone};
use super::widgets::{difficulty_badge, fit_height, frac, indent, plural, scroll_window};
use crate::progress::{Event, kind, mode};
use crate::schedule::{State, Status, local_day};
use crate::session::{self, Item, Reason};
use crate::{checkpoint, placement, stats};

pub struct Home {
    cursor: usize,
    offset: Cell<usize>,
    /// keys(), help() and owns_key() get no Shared, so update, init and view
    /// keep this copy of the state they depend on.
    snap: Cell<Snap>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct Snap {
    gate: bool,
    sharp: bool,
    checkin: bool,
}

fn snap(sh: &Shared) -> Snap {
    let gate = needs_placement(sh);
    Snap {
        gate,
        sharp: !gate && keep_sharp_queue(&queue(sh)),
        checkin: !gate && suggest_checkpoint(sh) > 0,
    }
}

impl Default for Home {
    fn default() -> Self {
        Self::new()
    }
}

/// Records e, keeping a save failure on screen instead of losing it.
pub(crate) fn record(sh: &mut Shared, e: Event) {
    if let Err(err) = sh.app.record(e) {
        sh.status = format!("could not save progress: {err}");
    }
}

pub(crate) fn now(sh: &Shared) -> Timestamp {
    (sh.app.now)()
}

/// An event with no problem or attempt, like Go's placement/checkpoint markers.
pub(crate) fn marker(sh: &Shared, kind: &str, mode: &str, data: Vec<(&str, String)>) -> Event {
    Event {
        time: now(sh),
        kind: kind.into(),
        problem: String::new(),
        attempt: String::new(),
        mode: mode.into(),
        data: data.into_iter().map(|(k, v)| (k.to_string(), v)).collect(),
    }
}

fn needs_placement(sh: &Shared) -> bool {
    placement::needs(&sh.app.events, &sh.app.attempts())
}

fn queue(sh: &Shared) -> Vec<Item<'_>> {
    session::today(
        &sh.app.catalog,
        sh.app.states(),
        now(sh),
        &sh.app.tz,
        sh.app.config.new_per_day,
        &sh.app.events,
    )
}

fn suggest_checkpoint(sh: &Shared) -> u64 {
    checkpoint::suggest_through(&sh.app.catalog, &sh.app.events, &sh.app.attempts())
}

fn keep_sharp_queue(items: &[Item]) -> bool {
    !items.is_empty() && items.iter().all(|it| it.kind == session::Kind::Practice)
}

fn greeting(hour: i8) -> &'static str {
    match hour {
        5..=11 => "Good morning",
        12..=16 => "Good afternoon",
        _ => "Good evening",
    }
}

fn tab_key(key: &str) -> Option<usize> {
    match key {
        "m" => Some(1),
        "i" => Some(2),
        "p" => Some(3),
        "s" => Some(4),
        _ => None,
    }
}

fn texts(lines: &[&str]) -> Lines {
    lines.iter().map(|l| Line::from(l.to_string())).collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct QueueCols {
    title_w: usize,
    reason_w: usize,
    kind: bool,
    diff: bool,
}

const QUEUE_KIND_W: usize = 8; // widest kind badge, " REVIEW "
const QUEUE_DIFF_W: usize = 6; // " easy " / " med  " / " hard "
const QUEUE_SEP: usize = 2;
const QUEUE_MIN_TITLE: usize = 12;
const QUEUE_MIN_REASON: usize = 8;
const QUEUE_REASON_WANT: usize = 16;

fn layout_queue(inner: usize, longest_title: usize, reason_need: usize) -> QueueCols {
    let mut c = QueueCols {
        title_w: 0,
        reason_w: 0,
        kind: true,
        diff: true,
    };
    let fixed = |c: &QueueCols| {
        let mut n = 2; // selection marker
        if c.kind {
            n += QUEUE_SEP + QUEUE_KIND_W;
        }
        if c.diff {
            n += QUEUE_SEP + QUEUE_DIFF_W;
        }
        n
    };
    let avail = inner as isize - fixed(&c) as isize;
    if avail - (QUEUE_SEP + QUEUE_MIN_REASON) as isize >= QUEUE_MIN_TITLE as isize {
        let avail = avail as usize;
        let room = avail - QUEUE_SEP - reason_need.min(QUEUE_REASON_WANT);
        c.title_w = longest_title.min(room).max(QUEUE_MIN_TITLE);
        c.reason_w = avail - QUEUE_SEP - c.title_w;
        return c;
    }
    if inner.saturating_sub(fixed(&c)) < QUEUE_MIN_TITLE {
        c.diff = false;
    }
    if inner.saturating_sub(fixed(&c)) < QUEUE_MIN_TITLE {
        c.kind = false;
    }
    c.title_w = longest_title.min(inner.saturating_sub(fixed(&c))).max(1);
    c
}

/// Whole local days between the last finish and now.
fn days_since(sh: &Shared, st: &State, now: Timestamp) -> i64 {
    let tz = &sh.app.tz;
    st.last_finished.map_or(0, |last| {
        i64::from((local_day(now, tz) - local_day(last, tz)).get_days())
    })
}

/// Reviews that come due in the next seven days, after today.
fn upcoming(sh: &Shared, states: &HashMap<String, State>, now: Timestamp) -> i64 {
    let tz = &sh.app.tz;
    let midnight = |days: i64| {
        local_day(now, tz)
            .checked_add(days.days())
            .ok()
            .and_then(|d| d.to_zoned(tz.clone()).ok())
            .map(|z| z.timestamp())
    };
    let (Some(today), Some(week)) = (midnight(0), midnight(7)) else {
        return 0;
    };
    let n = states
        .values()
        .filter(|st| st.status != Status::Unseen)
        .filter(|st| st.due.is_some_and(|d| d > today && d <= week))
        .count();
    n as i64
}

impl Home {
    pub fn new() -> Home {
        Home {
            cursor: 0,
            offset: Cell::new(0),
            snap: Cell::new(Snap::default()),
        }
    }

    fn reason(&self, sh: &Shared, it: &Item) -> Line<'static> {
        let th = &sh.theme;
        let style = match it.reason {
            Some(Reason::Weak | Reason::KeepSharp) => th.fail,
            Some(Reason::InProgress | Reason::InterviewMix) => th.accent,
            Some(Reason::ColdRedo) => th.due,
            _ => th.muted,
        };
        let tech = sh.app.catalog.technique_of(it.problem).title.to_lowercase();
        Line::from(vec![
            Span::styled(it.reason.map_or("", Reason::as_str), style),
            Span::styled(format!(" · {tech}"), th.muted),
        ])
    }

    fn row(
        &self,
        sh: &Shared,
        it: &Item,
        now: Timestamp,
        cols: QueueCols,
        inner: usize,
        selected: bool,
    ) -> Line<'static> {
        let th = &sh.theme;
        let mut title = ui::pad(Line::from(it.problem.title.clone()), cols.title_w);
        let mut marker = Span::raw("  ");
        if selected {
            marker = Span::styled("▸ ", th.accent);
            title = title.patch_style(th.selected);
        }
        let (kind, age) = match it.kind {
            session::Kind::Review => {
                let days = days_since(sh, &it.state, now);
                let age = if it.overdue_days > 0 {
                    Line::styled(format!("late {}d", it.overdue_days), th.due)
                } else if days > 0 {
                    Line::styled(format!("{days}d ago"), th.muted)
                } else {
                    Line::styled("due", th.due)
                };
                (ui::badge(th, "REVIEW", BadgeKind::Review), age)
            }
            session::Kind::Practice => {
                (ui::badge(th, "DRILL", BadgeKind::Info), self.reason(sh, it))
            }
            session::Kind::New => (ui::badge(th, "NEW", BadgeKind::New), self.reason(sh, it)),
        };
        let mut spans = vec![marker];
        spans.extend(title.spans);
        let mut push = |line: Line<'static>| {
            spans.push(Span::raw("  "));
            spans.extend(line.spans);
        };
        if cols.kind {
            push(ui::pad(Line::from(kind), QUEUE_KIND_W));
        }
        if cols.diff {
            push(ui::pad(
                Line::from(difficulty_badge(th, it.problem.difficulty)),
                QUEUE_DIFF_W,
            ));
        }
        if cols.reason_w > 0 {
            push(ui::truncate(age, cols.reason_w));
        }
        ui::truncate(Line::from(spans), inner)
    }

    fn queue_card(
        &self,
        sh: &Shared,
        items: &[Item],
        now: Timestamp,
        width: usize,
        body_rows: usize,
    ) -> Lines {
        let th = &sh.theme;
        if items.is_empty() {
            let key = |k: &str, text: &str| {
                Line::from(vec![
                    Span::styled(k.to_string(), th.accent),
                    Span::raw(text.to_string()),
                ])
            };
            let mut body = texts(&[
                "No reviews due and nothing left to introduce yet.",
                "When you are ready for more practice:",
                "",
            ]);
            body.push(key("2", "  open the curriculum map"));
            body.push(key("3", "  start a timed mock interview"));
            body.push(key("/", "  search for a specific problem"));
            return ui::card(th, "you're all caught up", body, width, false);
        }
        let sharp = keep_sharp_queue(items);
        let inner = width.saturating_sub(4);
        let longest = items
            .iter()
            .map(|it| ui::str_width(&it.problem.title))
            .max()
            .unwrap_or(0);
        let reason_need = items
            .iter()
            .map(|it| self.reason(sh, it).width())
            .max()
            .unwrap_or(0);
        let cols = layout_queue(inner, longest, reason_need);
        let body_rows = body_rows.max(1);
        // Pitch only when there is room for it plus at least one problem row.
        let show_pitch = sharp && body_rows >= 2;
        let list_budget = body_rows - usize::from(show_pitch);
        let visible = list_budget.min(items.len()).max(1);
        let cursor = self.cursor.min(items.len() - 1);
        let offset = scroll_window(cursor, self.offset.get(), visible);
        self.offset.set(offset);
        let mut rows: Lines = Vec::new();
        if show_pitch {
            // Pitch stays with the drills so a check-in card never buries it.
            rows.push(ui::truncate(
                Line::styled(
                    "Cold redos & shaky spots · drills leave your schedule alone",
                    th.muted,
                ),
                inner,
            ));
        }
        for (i, it) in items.iter().enumerate().skip(offset) {
            if rows.len() >= body_rows {
                break;
            }
            rows.push(self.row(sh, it, now, cols, inner, i == cursor));
        }
        rows.resize(body_rows, Line::default());
        let mut title = if sharp { "keep sharp" } else { "today" }.to_string();
        if items.len() > visible {
            title = format!("{title} · {}/{}", cursor + 1, items.len());
        }
        ui::card(th, &title, rows, width, true)
    }

    fn placement_warmup_card(&self, sh: &Shared, width: usize) -> Lines {
        let th = &sh.theme;
        let mut body = texts(&[
            "We will walk you through a few easy problems, each with an interview-style \
             timer (usually 15 minutes). Going over or using a hint tells us that topic \
             still needs practice. Skip any topic you want.",
            "",
            "You will cover:",
        ]);
        for (i, s) in placement::DEFAULT_SLOTS.iter().enumerate() {
            body.push(Line::from(vec![
                Span::styled("○  ", th.muted),
                Span::raw(format!("{}. {}", i + 1, s.topic)),
            ]));
        }
        body.push(Line::default());
        body.push(Line::from(vec![
            Span::styled("enter", th.accent),
            Span::raw(" begin the warm-up    "),
            Span::styled("n", th.muted),
            Span::raw(" skip for now"),
        ]));
        ui::card(th, "placement warm-up", body, width, true)
    }

    fn how_today_works_card(&self, sh: &Shared, width: usize) -> Lines {
        let th = &sh.theme;
        let bullet = |text: &str| {
            Line::from(vec![
                Span::styled("•", th.muted),
                Span::raw(format!(" {text}")),
            ])
        };
        let mut body = texts(&[
            "When you finish, we will put together a practice plan based on how it went.",
            "",
            "Here is what we will include:",
        ]);
        body.push(bullet("reviews that are ready for you"));
        body.push(bullet("topics that felt shaky in the warm-up"));
        body.push(bullet("new problems as you keep learning"));
        body.push(Line::default());
        body.push(Line::from(vec![
            Span::raw("Explore the full curriculum anytime from the "),
            Span::styled("map (2)", th.accent),
            Span::raw("."),
        ]));
        body.push(Line::from("We will keep adjusting your plan as you grow."));
        ui::card(th, "what happens next", body, width, false)
    }

    fn checkpoint_card(&self, sh: &Shared, through: u64, width: usize) -> Lines {
        let th = &sh.theme;
        let title = checkpoint::module_title(&sh.app.catalog, through).unwrap_or("");
        let body = vec![
            Line::from(format!(
                "You have put in a good stretch of practice. When you are ready, we will \
                 give you a few timed problems on what you have learned through {title}, \
                 then refresh your plan."
            )),
            Line::default(),
            Line::from(vec![
                Span::styled("c", th.accent),
                Span::raw(" start the check-in    "),
                Span::styled("n", th.muted),
                Span::raw(" remind me later"),
            ]),
        ];
        ui::card(th, "recommended check-in", body, width, true)
    }

    fn streak_dots(&self, sh: &Shared, sum: &stats::Summary, now: Timestamp) -> Line<'static> {
        let today = local_day(now, &sh.app.tz);
        let days: Vec<bool> = (0..7i64)
            .map(|i| {
                today
                    .checked_sub((6 - i).days())
                    .ok()
                    .and_then(|d| sum.heatmap.get(&d))
                    .is_some_and(|&n| n > 0)
            })
            .collect();
        ui::dots(&sh.theme, &days)
    }

    fn you_card(
        &self,
        sh: &Shared,
        sum: &stats::Summary,
        now: Timestamp,
        width: usize,
        sharp: bool,
        compact: bool,
    ) -> Lines {
        let th = &sh.theme;
        let mut streak = vec![Span::styled("Practice streak", th.title), Span::raw("  ")];
        streak.extend(self.streak_dots(sh, sum, now).spans);
        streak.push(Span::styled(
            format!("  {} day streak", sum.streak),
            th.muted,
        ));
        let mut mastery = vec![Span::styled("Mastery", th.title), Span::raw("         ")];
        mastery.extend(ui::bar(th, frac(sum.mastery[0], sum.mastery[1]), 10, Tone::Pass).spans);
        mastery.push(Span::styled(
            format!("  {}/{} problems", sum.mastery[0], sum.mastery[1]),
            th.muted,
        ));
        let mut lines = vec![Line::from(streak), Line::from(mastery)];
        if !compact {
            let n = upcoming(sh, sh.app.states(), now);
            if n > 0 {
                lines.push(Line::styled(
                    format!("{} coming due this week.", plural(n, "review", "reviews")),
                    th.muted,
                ));
            }
            if sharp {
                lines.push(Line::default());
                lines.push(Line::styled("Stay interview-ready", th.title));
                lines.push(Line::from(vec![
                    Span::styled(
                        "Nothing is due, so we queued drills across techniques: cold redos and \
                         shaky spots first. Drills do not change your review schedule. A full \
                         mock is always on tab ",
                        th.muted,
                    ),
                    Span::styled("3", th.accent),
                    Span::raw("."),
                ]));
            } else if !sum.weakest.is_empty() {
                let names: Vec<String> = sum
                    .weakest
                    .iter()
                    .take(3)
                    .map(|w| w.technique.title.to_lowercase())
                    .collect();
                lines.push(Line::default());
                lines.push(Line::styled("Where to focus", th.title));
                lines.push(Line::styled(format!("{}.", names.join(", ")), th.muted));
                lines.push(Line::styled(
                    "These have been difficult lately, so we will prioritize them for you.",
                    th.muted,
                ));
            }
        }
        ui::card(th, "your progress", lines, width, false)
    }

    fn view_placement(&self, sh: &Shared, w: usize, ht: usize, card_w: usize, hour: i8) -> Lines {
        let th = &sh.theme;
        let mut lines = vec![
            Line::default(),
            ui::truncate(
                Line::from(vec![
                    Span::raw("  "),
                    Span::styled(greeting(hour), th.title),
                    Span::styled(" · let's find the right place for you to begin", th.muted),
                ]),
                w,
            ),
            Line::default(),
        ];
        if let Some(err) = &sh.app.python_err {
            lines.push(ui::truncate(
                Line::from(vec![
                    Span::raw("  "),
                    Span::styled(format!("tests cannot run: {err}"), th.fail),
                ]),
                w,
            ));
            lines.push(Line::default());
        }
        const GAP: usize = 2;
        let panels = match ui::split_row(card_w, GAP) {
            Some((lw, rw)) => ui::join_panels(
                self.placement_warmup_card(sh, lw),
                self.how_today_works_card(sh, rw),
                GAP,
                card_w,
            ),
            None => ui::join_panels(
                self.placement_warmup_card(sh, card_w),
                self.how_today_works_card(sh, card_w),
                GAP,
                card_w,
            ),
        };
        lines.extend(indent(panels, 2));
        fit_height(lines, ht)
    }
}

impl Screen for Home {
    fn title(&self) -> String {
        "today".into()
    }

    fn tab(&self) -> Option<usize> {
        Some(0)
    }

    fn kind(&self) -> Kind {
        Kind::Home
    }

    fn init(&mut self, sh: &mut Shared) -> Cmd {
        self.snap.set(snap(sh));
        Cmd::None
    }

    fn help(&self) -> Lines {
        let snap = self.snap.get();
        if snap.gate {
            return texts(&[
                "enter  begin the placement warm-up",
                "n      skip the warm-up for now",
                "m      open the curriculum map",
                "i      open timed practice",
                "p      open playlists",
                "s      open stats",
            ]);
        }
        if snap.sharp {
            return texts(&[
                "enter  start the selected interview drill",
                "m      open the curriculum map",
                "i      open a full timed mock",
                "p      open playlists",
                "s      open stats",
            ]);
        }
        texts(&[
            "enter  start the selected problem",
            "c      start the recommended check-in",
            "n      snooze the check-in",
            "m      open the curriculum map",
            "i      open timed practice",
            "p      open playlists",
            "s      open stats",
        ])
    }

    /// Claims "/" during the placement gate so search is not offered or opened.
    fn owns_key(&self, key: &str) -> bool {
        self.snap.get().gate && key == "/"
    }

    fn keys(&self) -> Vec<Key> {
        let snap = self.snap.get();
        if snap.gate {
            return vec![Key::new("enter", "begin"), Key::new("n", "skip for now")];
        }
        let start = if snap.sharp { "drill" } else { "start" };
        if snap.checkin {
            let mut keys = vec![
                Key::new("enter", start),
                Key::new("c", "check-in"),
                Key::new("n", "snooze"),
                Key::new("↑/↓", "move"),
            ];
            if snap.sharp {
                keys.push(Key::new("i", "mock"));
            }
            return keys;
        }
        if snap.sharp {
            return vec![
                Key::new("enter", "drill"),
                Key::new("↑/↓", "move"),
                Key::new("i", "mock"),
                Key::new("/", "search"),
            ];
        }
        vec![
            Key::new("enter", "start"),
            Key::new("↑/↓", "move"),
            Key::new("/", "search"),
        ]
    }

    fn view(&self, sh: &Shared, w: usize, ht: usize) -> Lines {
        self.snap.set(snap(sh));
        let th = &sh.theme;
        let now = now(sh);
        let hour = now.to_zoned(sh.app.tz.clone()).hour();
        let card_w = w.saturating_sub(4);
        if self.snap.get().gate {
            return self.view_placement(sh, w, ht, card_w, hour);
        }
        let attempts = sh.app.attempts();
        let sum = stats::compute(&sh.app.catalog, sh.app.states(), &attempts, now, &sh.app.tz);
        let items = queue(sh);
        let sharp = keep_sharp_queue(&items);
        let count = |k: session::Kind| items.iter().filter(|it| it.kind == k).count() as i64;
        let (reviews, fresh, drills) = (
            count(session::Kind::Review),
            count(session::Kind::New),
            count(session::Kind::Practice),
        );
        let finished = attempts
            .iter()
            .filter(|a| a.outcome != crate::schedule::Outcome::None)
            .count();

        let sub = if sharp {
            format!(
                "keep sharp · {}",
                plural(drills, "interview drill", "interview drills")
            )
        } else {
            format!(
                "{} and {fresh} new today",
                plural(reviews, "review", "reviews")
            )
        };
        let muted_line = |text: &str| {
            ui::truncate(
                Line::from(vec![
                    Span::raw("  "),
                    Span::styled(text.to_string(), th.muted),
                ]),
                w,
            )
        };
        let mut lines = vec![
            Line::default(),
            ui::truncate(
                Line::from(vec![
                    Span::raw("  "),
                    Span::styled(greeting(hour), th.title),
                    Span::styled(format!(" · {sub}"), th.muted),
                ]),
                w,
            ),
        ];
        if let Some(err) = &sh.app.python_err {
            lines.push(ui::truncate(
                Line::from(vec![
                    Span::raw("  "),
                    Span::styled(format!("tests cannot run: {err}"), th.fail),
                ]),
                w,
            ));
        }
        if finished == 0 {
            lines.push(muted_line(
                "Complete a few problems and we will learn where you are strongest.",
            ));
        } else if sharp {
            lines.push(muted_line(
                "Curriculum on track: drills below keep you interview-ready.",
            ));
        }
        lines.push(Line::default());

        let through = suggest_checkpoint(sh);
        if through > 0 {
            lines.extend(indent(self.checkpoint_card(sh, through, card_w), 2));
            lines.push(Line::default());
        }

        let avail = ht.saturating_sub(lines.len()).max(4);
        const GAP: usize = 2;
        let panels = if let Some((left_w, right_w)) = ui::split_row(card_w, GAP) {
            let you = self.you_card(sh, &sum, now, right_w, sharp, false);
            let queue_rows = avail.saturating_sub(2).max(1);
            let queue = self.queue_card(sh, &items, now, left_w, queue_rows);
            ui::join_panels(queue, you, GAP, card_w)
        } else {
            // Stacked (half-width panes): shrink the queue first, then compact
            // progress, so "your progress" is never clipped by fit_height.
            const STACK_GAP: usize = 2; // blank line join_panels inserts between cards
            let rows_for = |you_h: usize| avail as isize - you_h as isize - STACK_GAP as isize - 2;
            let mut you = self.you_card(sh, &sum, now, card_w, sharp, false);
            let mut queue_rows = rows_for(you.len());
            if queue_rows < 1 {
                you = self.you_card(sh, &sum, now, card_w, sharp, true);
                queue_rows = rows_for(you.len());
            }
            let queue = self.queue_card(sh, &items, now, card_w, queue_rows.max(1) as usize);
            ui::join_panels(queue, you, GAP, card_w)
        };
        lines.extend(indent(panels, 2));
        fit_height(lines, ht)
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let cmd = self.handle(sh, msg);
        self.snap.set(snap(sh));
        cmd
    }
}

impl Home {
    fn handle(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            return Cmd::None;
        };
        let key = k.name.as_str();
        if let Some(tab) = tab_key(key) {
            return Cmd::Tab(tab);
        }
        if needs_placement(sh) {
            match key {
                "enter" => return Cmd::Push(Box::new(Placement::start())),
                "n" => {
                    let e = marker(
                        sh,
                        kind::PLACEMENT_DONE,
                        mode::PLACEMENT,
                        vec![("skipped", "1".into())],
                    );
                    record(sh, e);
                }
                _ => {}
            }
            return Cmd::None;
        }
        let items = queue(sh);
        let len = items.len();
        let picked = items
            .get(self.cursor)
            .map(|it| (it.problem.id.clone(), it.kind == session::Kind::Practice));
        drop(items);
        let through = suggest_checkpoint(sh);
        match key {
            "j" | "down" => self.cursor = (self.cursor + 1).min(len.saturating_sub(1)),
            "k" | "up" => self.cursor = self.cursor.saturating_sub(1),
            "enter" => {
                if let Some((id, drill)) = picked {
                    // Keep-sharp drills never climb or drop the review ladder.
                    let m = if drill { mode::DRILL } else { mode::PRACTICE };
                    return Cmd::Push(screens::new_focus(sh, &id, m));
                }
            }
            "c" if through > 0 => return Cmd::Push(screens::new_checkpoint(sh)),
            "n" if through > 0 => {
                let mut e = marker(sh, kind::CHECKPOINT_DONE, mode::CHECKPOINT, Vec::new());
                e.data = checkpoint::snooze(through);
                record(sh, e);
            }
            _ => {}
        }
        Cmd::None
    }
}

#[cfg(test)]
pub(crate) mod fixtures {
    use std::collections::BTreeMap;

    use jiff::{Timestamp, ToSpan};
    use ratatui::Terminal;
    use ratatui::backend::TestBackend;

    use crate::progress::{Event, kind, mode, new_attempt_id};
    use crate::testutil::chicago;
    use crate::tui::app::{App as Frame, KeyPress, Msg, Shared, test_shared};

    /// Mon Oct 19 2026, 10:00 Chicago, like Go's testNow.
    pub fn test_now() -> Timestamp {
        jiff::civil::date(2026, 10, 19)
            .at(10, 0, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp()
    }

    /// test_now shifted by whole local days.
    pub fn days(n: i64) -> Timestamp {
        test_now()
            .to_zoned(chicago())
            .checked_add(n.days())
            .unwrap()
            .timestamp()
    }

    pub fn set_now(sh: &mut Shared, t: Timestamp) {
        sh.app.now = Box::new(move || t);
    }

    pub fn ev(time: Timestamp, kind: &str, problem: &str, attempt: &str, mode: &str) -> Event {
        Event {
            time,
            kind: kind.into(),
            problem: problem.into(),
            attempt: attempt.into(),
            mode: mode.into(),
            data: BTreeMap::new(),
        }
    }

    /// A five-minute practice pass on 2026-10-<day>.
    pub fn passed_events(id: &str, day: i64) -> Vec<Event> {
        let start = days(day - 19);
        let att = new_attempt_id();
        let mut passed = ev(start + 5.minutes(), kind::PASSED, id, &att, mode::PRACTICE);
        passed.data.insert("elapsed_ms".into(), "300000".into());
        vec![ev(start, kind::OPENED, id, &att, mode::PRACTICE), passed]
    }

    /// Three given-up attempts, so the technique reads as weak.
    pub fn gave_up_thrice(id: &str, from_day: i64) -> Vec<Event> {
        (0..3)
            .flat_map(|i| {
                let at = days(from_day + i);
                let att = new_attempt_id();
                [
                    ev(at, kind::OPENED, id, &att, mode::PRACTICE),
                    ev(at + 1.minutes(), kind::GAVE_UP, id, &att, mode::PRACTICE),
                ]
            })
            .collect()
    }

    pub fn placement_skipped() -> Event {
        let mut e = ev(test_now(), kind::PLACEMENT_DONE, "", "", mode::PLACEMENT);
        e.data.insert("skipped".into(), "1".into());
        e
    }

    pub fn checkpoint_snoozed(at: Timestamp) -> Event {
        let mut e = ev(at, kind::CHECKPOINT_DONE, "", "", mode::CHECKPOINT);
        e.data.insert("through".into(), "99".into());
        e.data.insert("snoozed".into(), "1".into());
        e
    }

    /// A fresh learner at test_now in Chicago, with events recorded in order.
    pub fn shared_with(events: Vec<Event>) -> Shared {
        let mut sh = test_shared();
        set_now(&mut sh, test_now());
        sh.app.tz = chicago();
        for e in events {
            sh.app.record(e).unwrap();
        }
        sh
    }

    /// Past the placement gate and check-in card, like Go's homeModel.
    pub fn home_shared(events: Vec<Event>) -> Shared {
        let mut all = vec![placement_skipped(), checkpoint_snoozed(test_now())];
        all.extend(events);
        shared_with(all)
    }

    pub fn send(f: &mut Frame, keys: &[&str]) {
        for k in keys {
            f.update(Msg::Key(KeyPress::named(k)));
        }
    }

    /// The frame through ratatui's TestBackend, one string per row.
    pub fn rows(f: &mut Frame, w: u16, h: u16) -> Vec<String> {
        f.resize(w.into(), h.into());
        let mut term = Terminal::new(TestBackend::new(w, h)).unwrap();
        term.draw(|fr| f.draw(fr)).unwrap();
        let buf = term.backend().buffer().clone();
        (0..h)
            .map(|y| (0..w).map(|x| buf[(x, y)].symbol().to_string()).collect())
            .collect()
    }

    pub fn screen(f: &mut Frame, w: u16, h: u16) -> String {
        rows(f, w, h).join("\n")
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use jiff::ToSpan;

    use super::fixtures::*;
    use super::*;
    use crate::catalog::{Difficulty, Problem};
    use crate::tui::app::App as Frame;
    use crate::tui::theme::assert_palette;
    use crate::tui::ui::plain;

    fn home(events: Vec<Event>) -> Frame {
        Frame::new(home_shared(events))
    }

    fn reviews_two() -> Vec<Event> {
        let mut events = passed_events("p-three", 17); // due 18 -> 1 day overdue
        events.extend(passed_events("p-two", 18)); // due 19 -> due today
        events
    }

    fn all_passed_today() -> Vec<Event> {
        ["two-sum", "p-one", "p-two", "p-three"]
            .iter()
            .flat_map(|id| passed_events(id, 19))
            .collect()
    }

    fn assert_golden(got: &[String], golden: &str) {
        let want: Vec<&str> = golden.split('\n').collect();
        assert_eq!(got.len(), want.len(), "{}", got.join("\n"));
        for (i, (g, w)) in got.iter().zip(&want).enumerate() {
            assert_eq!(g.trim_end(), w.trim_end(), "line {i}\n{}", got.join("\n"));
        }
    }

    fn assert_fits(lines: &Lines, w: usize, h: usize, what: &str) {
        assert!(lines.len() <= h, "{what}: {} lines > {h}", lines.len());
        for l in lines {
            assert!(l.width() <= w, "{what}: {} > {w}: {}", l.width(), plain(l));
        }
    }

    #[test]
    fn golden_80x24() {
        let mut f = home(reviews_two());
        assert_golden(
            &rows(&mut f, 80, 24),
            include_str!("../testdata/golden/home.golden"),
        );
    }

    #[test]
    fn golden_120x32() {
        let mut f = home(reviews_two());
        assert_golden(
            &rows(&mut f, 120, 32),
            include_str!("../testdata/golden/home_wide.golden"),
        );
    }

    #[test]
    fn empty_queue_becomes_keep_sharp() {
        let view = screen(&mut home(all_passed_today()), 80, 24);
        for want in [
            "keep sharp",
            "interview drill",
            "DRILL",
            "Curriculum on track",
        ] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
        assert!(!view.contains("all caught up"), "{view}");
    }

    #[test]
    fn keep_sharp_opens_drill_mode() {
        let mut events = all_passed_today();
        // Snooze after the passes so a check-in card does not steal the drill path.
        events.push(checkpoint_snoozed(test_now() + 1.hours()));
        let mut f = home(events);
        assert_eq!(f.top().keys()[0], Key::new("enter", "drill"));
        send(&mut f, &["enter"]);
        assert_eq!((f.depth(), f.top().kind()), (2, Kind::Focus));
        assert!(f.top().title().contains("drill"), "{}", f.top().title());
    }

    #[test]
    fn navigation_and_enter_open_practice() {
        let mut f = home(Vec::new());
        let first = screen(&mut f, 80, 24);
        assert!(first.contains("▸ P One"), "{first}");
        send(&mut f, &["j"]);
        let view = screen(&mut f, 80, 24);
        assert!(view.contains("▸ P Three"), "{view}");
        send(&mut f, &["k", "k", "down"]);
        let view = screen(&mut f, 80, 24);
        assert!(view.contains("▸ P Three"), "{view}");
        send(&mut f, &["enter"]);
        assert_eq!((f.depth(), f.top().kind()), (2, Kind::Focus));
        assert!(f.top().title().contains("P Three"), "{}", f.top().title());
    }

    #[test]
    fn resize_narrow_fits() {
        let mut f = home(Vec::new());
        assert_eq!(rows(&mut f, 40, 10).len(), 10);
        let sh = home_shared(Vec::new());
        assert_fits(&Home::new().view(&sh, 40, 7), 40, 7, "40x7");
    }

    #[test]
    fn stacked_short_shows_progress() {
        let view = screen(&mut home(reviews_two()), 80, 22);
        for want in ["your progress", "Practice streak", "Mastery"] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
    }

    #[test]
    fn help_toggles() {
        let mut f = home(Vec::new());
        send(&mut f, &["?"]);
        let view = screen(&mut f, 80, 24);
        assert!(
            view.contains("keys") && view.contains("start the selected problem"),
            "{view}"
        );
        send(&mut f, &["?"]);
        assert!(!screen(&mut f, 80, 24).contains("╭─ keys"));
    }

    #[test]
    fn greeting_by_hour() {
        for (hour, want) in [
            (9, "Good morning"),
            (14, "Good afternoon"),
            (22, "Good evening"),
            (3, "Good evening"),
        ] {
            let mut sh = shared_with(vec![placement_skipped()]);
            let t = jiff::civil::date(2026, 10, 19)
                .at(hour, 0, 0, 0)
                .to_zoned(crate::testutil::chicago())
                .unwrap()
                .timestamp();
            set_now(&mut sh, t);
            let view = screen(&mut Frame::new(sh), 80, 24);
            assert!(
                view.contains(want) && view.contains("3 new today"),
                "{hour}:\n{view}"
            );
        }
    }

    #[test]
    fn queue_is_one_card() {
        let view = screen(&mut home(Vec::new()), 80, 24);
        assert!(
            view.contains("╭─ today") && view.contains("╭─ your progress"),
            "{view}"
        );
        assert!(view.contains("▸ "), "{view}");
    }

    #[test]
    fn focus_section_names_weakest() {
        let mut events = vec![placement_skipped()];
        events.extend(gave_up_thrice("p-one", -5));
        let view = screen(&mut Frame::new(shared_with(events)), 120, 32);
        for want in [
            "╭─ your progress",
            "Where to focus",
            "one",
            "difficult",
            "prioritize",
        ] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
    }

    #[test]
    fn no_focus_section_when_fresh() {
        let view = screen(&mut home(Vec::new()), 80, 24);
        assert!(!view.contains("Where to focus"), "{view}");
        assert!(view.contains("where you are strongest"), "{view}");
    }

    #[test]
    fn titles_use_the_room() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let Ok(c) = crate::catalog::load(&root) else {
            return; // real curriculum unavailable
        };
        let mut sh = shared_with(vec![placement_skipped()]);
        sh.app.catalog = c;
        let view = screen(&mut Frame::new(sh), 80, 24);
        assert!(
            !view.contains("…   NEW") && view.contains("Range Sum Query - Immutable"),
            "{view}"
        );
    }

    #[test]
    fn shows_upcoming_reviews() {
        let view = screen(&mut home(passed_events("p-two", 19)), 80, 24);
        assert!(view.contains("1 review coming due this week"), "{view}");
    }

    #[test]
    fn shows_streak_and_mastery() {
        let view = screen(&mut home(passed_events("p-one", 18)), 80, 24);
        for want in ["day streak", "Mastery", "0/4"] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
    }

    #[test]
    fn says_why_new_problems_were_picked() {
        let view = screen(&mut home(Vec::new()), 120, 30);
        assert!(view.contains("new topic · one"), "{view}");
        let mut events = vec![placement_skipped()];
        events.extend(gave_up_thrice("p-one", -3));
        let view = screen(&mut Frame::new(shared_with(events)), 120, 30);
        assert!(view.contains("weak spot · one"), "{view}");
    }

    #[test]
    fn placement_gate_for_new_users() {
        let mut f = Frame::new(shared_with(Vec::new()));
        let ls = rows(&mut f, 80, 24);
        let view = ls.join("\n");
        for want in [
            "placement warm-up",
            "right place for you to begin",
            "1. arrays and hashing",
            "5. binary search",
            "begin the warm-up",
            "what happens next",
        ] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
        assert!(!view.contains("╭─ today"), "{view}");
        assert!(!ls[23].contains("/ search"), "{view}");
        send(&mut f, &["/"]);
        assert_eq!(f.depth(), 1, "the gate does not open search");

        let wide = screen(&mut Frame::new(shared_with(Vec::new())), 120, 32);
        let top = wide
            .lines()
            .find(|l| l.contains("╭─ placement warm-up"))
            .unwrap_or_default();
        assert!(
            top.contains("╭─ what happens next"),
            "side by side:\n{wide}"
        );

        send(&mut f, &["n"]);
        let view = screen(&mut f, 80, 24);
        assert!(
            !view.contains("placement warm-up") && view.contains("╭─ today"),
            "{view}"
        );
        assert!(placement::done(&f.sh.app.events));
    }

    #[test]
    fn enter_starts_placement_round() {
        let mut f = Frame::new(shared_with(Vec::new()));
        send(&mut f, &["enter"]);
        assert_eq!(f.top().title(), "placement");
        assert_eq!(f.top().keys()[1], Key::new("space", "submit"));
    }

    #[test]
    fn tab_keys_switch_tabs() {
        for (key, tab) in [("m", 1), ("i", 2), ("p", 3), ("s", 4)] {
            for sh in [home_shared(Vec::new()), shared_with(Vec::new())] {
                let mut f = Frame::new(sh);
                send(&mut f, &[key]);
                assert_eq!(f.active_tab(), tab, "{key}");
            }
        }
    }

    #[test]
    fn check_in_card_starts_and_snoozes() {
        let mut events = vec![placement_skipped()];
        for id in ["two-sum", "p-one", "p-two"] {
            events.extend(passed_events(id, 18));
        }
        let mut f = Frame::new(shared_with(events));
        let view = screen(&mut f, 80, 24);
        assert!(view.contains("recommended check-in"), "{view}");
        assert!(f.top().keys().contains(&Key::new("c", "check-in")));
        send(&mut f, &["c"]);
        assert_eq!(f.top().title(), "check-in");
        send(&mut f, &["esc", "n"]);
        let view = screen(&mut f, 80, 24);
        assert!(!view.contains("recommended check-in"), "snoozed:\n{view}");
        send(&mut f, &["c"]);
        assert_eq!(f.depth(), 1, "c does nothing without a recommendation");
    }

    #[test]
    fn queue_rows_never_wrap() {
        let mut sh = home_shared(Vec::new());
        sh.app.catalog.modules[0].techniques[0].title =
            "Array Manipulation And Prefix & Suffix Sums".into();
        let problem = |title: &str, difficulty| Problem {
            id: String::new(),
            title: title.into(),
            url: String::new(),
            key_idea: String::new(),
            prompt: String::new(),
            dir: PathBuf::new(),
            difficulty,
            leetcode: 0,
            hints: Vec::new(),
            say_aloud: Vec::new(),
            time_target: std::time::Duration::ZERO,
            number: 0,
            order: 0,
            module: 0,
            technique: 0,
            has_solution: false,
        };
        let ps = [
            problem("Longest Consecutive Sequence", Difficulty::Medium),
            problem("Range Sum Query - Immutable", Difficulty::Easy),
            problem("Rotate Array", Difficulty::Hard),
        ];
        let item = |p, kind, reason| Item {
            problem: p,
            kind,
            state: State::default(),
            overdue_days: 0,
            reason,
        };
        let items = vec![
            item(&ps[0], session::Kind::Review, None),
            item(&ps[1], session::Kind::New, Some(Reason::NewTopic)),
            item(&ps[2], session::Kind::Practice, Some(Reason::ColdRedo)),
        ];
        let h = Home::new();
        for w in 20..=160 {
            let card = h.queue_card(&sh, &items, test_now(), w, items.len());
            assert_eq!(card.len(), items.len() + 2, "width {w} wrapped");
            for (i, l) in card[1..card.len() - 1].iter().enumerate() {
                assert!(
                    plain(l).contains(&ps[i].title[..4]),
                    "width {w}: row {i} lost its title: {}",
                    plain(l)
                );
                assert!(l.width() <= w, "width {w}: {}", plain(l));
            }
        }
    }

    #[test]
    fn python_missing_banner() {
        for mut sh in [home_shared(Vec::new()), shared_with(Vec::new())] {
            sh.app.python_err = Some("no python found: run `uv sync` in the repo".into());
            let view = screen(&mut Frame::new(sh), 100, 24);
            assert!(view.contains("uv sync"), "{view}");
        }
    }

    #[test]
    fn zero_height_with_status_does_not_panic() {
        let mut sh = shared_with(Vec::new());
        sh.status = "something".into();
        let mut f = Frame::new(sh);
        f.resize(0, 0);
        let _ = f.view();
        let sh = home_shared(Vec::new());
        let _ = Home::new().view(&sh, 0, 0);
    }

    #[test]
    fn fits_all_sizes_and_palette() {
        let states = [
            home_shared(Vec::new()),
            home_shared(reviews_two()),
            home_shared(all_passed_today()),
            shared_with(Vec::new()),
        ];
        let h = Home::new();
        for sh in &states {
            for w in 60..=160 {
                for ht in (20..=40).step_by(5) {
                    let body = h.view(sh, w, ht - 3);
                    assert_fits(&body, w, ht - 3, &format!("{w}x{ht}"));
                    assert_palette(&body);
                }
            }
        }
    }

    #[test]
    fn key_bar_matches_state() {
        let f = home(Vec::new());
        let keys: Vec<String> = f.top().keys().iter().map(|k| k.key.clone()).collect();
        assert_eq!(keys, ["enter", "↑/↓", "/"]);
        let f = Frame::new(shared_with(Vec::new()));
        assert_eq!(
            f.top().keys(),
            [Key::new("enter", "begin"), Key::new("n", "skip for now")]
        );
        assert!(f.top().owns_key("/") && !f.top().owns_key("q"));
    }
}
