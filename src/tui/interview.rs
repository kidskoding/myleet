//! The timed tab's mock interview and Today's module check-in: a setup card,
//! a round over several embedded Focus screens, then a self-check and reveal.
//!
//! Unlike placement, the round keeps every problem open at once (the learner
//! switches between them), so it owns concrete `Focus` values and reads their
//! hints, penalties and last run directly instead of `FocusStatus` messages.

use std::collections::BTreeMap;

use jiff::{SignedDuration, Timestamp};
use ratatui::style::Modifier;
use ratatui::text::{Line, Span};

use super::app::{Cmd, Msg, Screen, Shared};
use super::focus::Focus;
use super::home::{marker, now, record};
use super::ui::{self, Key, Lines, Tone};
use super::widgets::{indent, mmss, spread};
use crate::checkpoint::{self, ItemResult, Level, Outcome};
use crate::interview::{self, ROUND_LENGTH, Rng};
use crate::progress::{kind, mode};

const SELF_CHECKS: [&str; 4] = [
    "restated the problem",
    "named the brute force",
    "stated time and space complexity",
    "covered edge cases",
];

const RED_UNDER: SignedDuration = SignedDuration::from_secs(5 * 60);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    Setup,
    Round,
    SelfCheck,
    Reveal,
}

/// Picks n problem ids for a mock round; tests swap it like Go's `pick`.
type Pick = fn(&Shared, usize, &mut Rng) -> Vec<String>;

fn pick_mock(sh: &Shared, n: usize, rng: &mut Rng) -> Vec<String> {
    let a = &sh.app;
    interview::pick(&a.catalog, a.states(), &a.attempts(), n, now(sh), rng)
        .into_iter()
        .map(|p| p.id.clone())
        .collect()
}

#[cfg(test)]
thread_local! {
    /// Lets frame-level tests choose the problems of a round they cannot reach into.
    static PICK: std::cell::Cell<Option<Pick>> = const { std::cell::Cell::new(None) };
}

fn default_pick() -> Pick {
    #[cfg(test)]
    if let Some(p) = PICK.with(std::cell::Cell::get) {
        return p;
    }
    pick_mock
}

pub struct Interview {
    phase: Phase,
    checkpoint: bool,
    n: usize,
    /// The check-in's ceiling module number.
    through: u64,
    ceil_idx: usize,
    pick: Pick,
    rng: Rng,
    foci: Vec<Focus>,
    cur: usize,
    start: Timestamp,
    /// When the current problem was last switched to.
    since: Timestamp,
    done: Vec<bool>,
    passed: Vec<bool>,
    times: Vec<SignedDuration>,
    spent: Vec<SignedDuration>,
    outcomes: Vec<Outcome>,
    checks: [bool; 4],
    confirm: bool,
}

impl Interview {
    pub fn new(sh: &Shared) -> Interview {
        let c = &sh.app.catalog;
        let through = checkpoint::default_through(c, &sh.app.attempts());
        let ceil_idx = checkpoint::ceiling_modules(c)
            .iter()
            .position(|m| m.number == through)
            .unwrap_or(0);
        Interview {
            phase: Phase::Setup,
            checkpoint: false,
            n: 1,
            through,
            ceil_idx,
            pick: default_pick(),
            rng: Rng::new(now(sh).as_nanosecond() as u64),
            foci: Vec::new(),
            cur: 0,
            start: Timestamp::UNIX_EPOCH,
            since: Timestamp::UNIX_EPOCH,
            done: Vec::new(),
            passed: Vec::new(),
            times: Vec::new(),
            spent: Vec::new(),
            outcomes: Vec::new(),
            checks: [false; 4],
            confirm: false,
        }
    }

    /// The check-in Today's `c` opens (Go `NewInterviewCheckpoint`).
    pub fn checkpoint(sh: &Shared) -> Interview {
        Interview {
            checkpoint: true,
            ..Interview::new(sh)
        }
    }

    fn focus_mode(&self) -> &'static str {
        if self.checkpoint {
            mode::CHECKPOINT
        } else {
            mode::INTERVIEW
        }
    }

    fn penalties(&self) -> SignedDuration {
        self.foci
            .iter()
            .fold(SignedDuration::ZERO, |t, f| t + f.penalties)
    }

    fn remaining(&self, sh: &Shared) -> SignedDuration {
        ROUND_LENGTH - now(sh).duration_since(self.start) - self.penalties()
    }

    fn begin(&mut self, sh: &mut Shared) -> Cmd {
        let ids = if self.checkpoint {
            let c = &sh.app.catalog;
            let ceilings = checkpoint::ceiling_modules(c);
            let Some(m) = ceilings.get(self.ceil_idx).or(ceilings.first()) else {
                sh.toast("no modules for a checkpoint");
                return Cmd::None;
            };
            self.through = m.number;
            let n = interview::checkpoint_size(c, self.through);
            interview::pick_checkpoint(c, sh.app.states(), self.through, n, &mut self.rng)
                .into_iter()
                .map(|p| p.id.clone())
                .collect()
        } else {
            (self.pick)(sh, self.n, &mut self.rng)
        };
        let problems: Vec<_> = ids
            .iter()
            .filter_map(|id| sh.app.catalog.problem(id).cloned())
            .collect();
        if problems.is_empty() {
            sh.toast("no problems to pick from");
            return Cmd::None;
        }
        let n = problems.len();
        self.start = now(sh);
        self.since = self.start;
        self.phase = Phase::Round;
        self.cur = 0;
        self.done = vec![false; n];
        self.passed = vec![false; n];
        self.times = vec![SignedDuration::ZERO; n];
        self.spent = vec![SignedDuration::ZERO; n];
        self.outcomes = vec![Outcome::Skipped; n];
        self.foci = problems
            .iter()
            .map(|p| Focus::new(sh, p, self.focus_mode()))
            .collect();
        let cmds = self.foci.iter_mut().map(|f| f.init(sh)).collect();
        Cmd::Batch(cmds)
    }

    /// Only the open problem's clock runs; hint penalties count against it.
    fn elapsed_of(&self, sh: &Shared, i: usize) -> SignedDuration {
        let mut d = self.spent[i] + self.foci[i].penalties;
        if i == self.cur && !self.done[i] {
            d += now(sh).duration_since(self.since);
        }
        d
    }

    fn sync_clocks(&mut self, sh: &Shared) {
        if self.phase != Phase::Round {
            return;
        }
        for i in 0..self.foci.len() {
            self.foci[i].clock = Some(self.elapsed_of(sh, i));
        }
    }

    fn switch_to(&mut self, sh: &Shared, i: usize) {
        let t = now(sh);
        if !self.done[self.cur] {
            self.spent[self.cur] += t.duration_since(self.since);
        }
        self.cur = i;
        self.since = t;
    }

    fn submit(&mut self, sh: &mut Shared, i: usize) {
        if self.done[i] {
            return;
        }
        self.times[i] = self.elapsed_of(sh, i);
        if i == self.cur {
            let t = now(sh);
            self.spent[i] += t.duration_since(self.since);
            self.since = t;
        }
        self.done[i] = true;
        let f = &mut self.foci[i];
        let passed = if self.checkpoint {
            self.outcomes[i] = checkpoint::score(f.green(), f.hints as u32, false);
            f.elapsed = self.times[i];
            matches!(self.outcomes[i], Outcome::Clean | Outcome::Hinted)
        } else {
            f.green()
        };
        let e = if passed {
            self.passed[i] = true;
            f.passed = true;
            f.elapsed = self.times[i];
            let ms = self.times[i].as_millis().to_string();
            f.event(sh, kind::PASSED, [("elapsed_ms".to_string(), ms)].into())
        } else {
            f.event(sh, kind::GAVE_UP, BTreeMap::new())
        };
        record(sh, e);
    }

    fn end_round(&mut self, sh: &mut Shared) {
        for i in 0..self.foci.len() {
            if !self.done[i] {
                if self.checkpoint {
                    self.times[i] = self.elapsed_of(sh, i);
                    self.done[i] = true;
                    self.outcomes[i] = Outcome::Skipped;
                    let e = self.foci[i].event(sh, kind::LEFT, BTreeMap::new());
                    record(sh, e);
                } else {
                    self.submit(sh, i);
                }
            }
            self.foci[i].close(sh);
        }
        if self.checkpoint {
            let mut e = marker(sh, kind::CHECKPOINT_DONE, mode::CHECKPOINT, Vec::new());
            e.data = checkpoint::encode(self.through, &self.results(sh));
            record(sh, e);
            self.phase = Phase::Reveal;
        } else {
            self.phase = Phase::SelfCheck;
        }
    }

    fn results(&self, sh: &Shared) -> Vec<ItemResult> {
        let c = &sh.app.catalog;
        self.foci
            .iter()
            .zip(&self.outcomes)
            .map(|(f, &o)| {
                let m = c.module_of(&f.p);
                ItemResult {
                    topic: m.title.clone(),
                    problem_id: f.p.id.clone(),
                    module_id: m.id.clone(),
                    outcome: o,
                    level: checkpoint::level_of(o),
                }
            })
            .collect()
    }

    fn round_key(&mut self, sh: &mut Shared, msg: &Msg, key: &str) -> Cmd {
        if self.confirm {
            self.confirm = false;
            if key == "y" {
                self.end_round(sh);
                // A check-in stays to show its results; a mock round's are abandoned.
                return if self.checkpoint { Cmd::None } else { Cmd::Pop };
            }
            return Cmd::None;
        }
        match key {
            "q" => self.confirm = true,
            "tab" => self.switch_to(sh, (self.cur + 1) % self.foci.len()),
            "space" => {
                self.submit(sh, self.cur);
                let n = self.foci.len();
                match (1..=n).map(|d| (self.cur + d) % n).find(|&i| !self.done[i]) {
                    Some(next) => self.switch_to(sh, next),
                    None => self.end_round(sh),
                }
            }
            // A round cannot be left by accident or peeked at.
            "esc" | "g" | "s" | "/" => {}
            _ => return self.foci[self.cur].update(sh, msg),
        }
        Cmd::None
    }

    fn handle(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            match msg {
                Msg::Tick
                    if self.phase == Phase::Round && self.remaining(sh) <= SignedDuration::ZERO =>
                {
                    self.end_round(sh);
                    return Cmd::None;
                }
                Msg::Mouse(m) => {
                    if self.phase != Phase::Round {
                        return Cmd::None;
                    }
                    // The round's status line sits one row above the problem's view.
                    let Some(row) = m.row.checked_sub(1) else {
                        return Cmd::None;
                    };
                    let mut m = *m;
                    m.row = row;
                    return self.foci[self.cur].update(sh, &Msg::Mouse(m));
                }
                _ => {}
            }
            let cmds = self.foci.iter_mut().map(|f| f.update(sh, msg)).collect();
            return Cmd::Batch(cmds);
        };
        let key = k.name.as_str();
        match self.phase {
            Phase::Setup => match key {
                "1" | "2" | "3" if !self.checkpoint => self.n = key.parse().unwrap_or(1),
                "left" | "h" if !self.checkpoint => self.n = self.n.saturating_sub(1).max(1),
                "right" | "l" if !self.checkpoint => self.n = (self.n + 1).min(3),
                "enter" => return self.begin(sh),
                "esc" => return Cmd::Pop,
                _ => {}
            },
            Phase::Round => return self.round_key(sh, msg, key),
            Phase::SelfCheck => {
                if let Ok(n) = key.parse::<usize>()
                    && (1..=SELF_CHECKS.len()).contains(&n)
                {
                    self.checks[n - 1] = !self.checks[n - 1];
                    if self.checks[n - 1] {
                        let data = [("item".to_string(), SELF_CHECKS[n - 1].to_string())];
                        let e = self.foci[0].event(sh, kind::SAY_ALOUD_CHECKED, data.into());
                        record(sh, e);
                    }
                }
                if key == "enter" {
                    self.phase = Phase::Reveal;
                }
            }
            Phase::Reveal => {
                if key == "enter" || key == "esc" {
                    return Cmd::Pop;
                }
            }
        }
        Cmd::None
    }

    fn choice(&self, sh: &Shared, n: usize) -> Span<'static> {
        let th = &sh.theme;
        let style = if self.n == n {
            th.accent.add_modifier(Modifier::REVERSED | Modifier::BOLD)
        } else {
            th.muted
        };
        Span::styled(format!(" [{n}] "), style)
    }

    fn card(&self, sh: &Shared, title: &str, body: Lines, w: usize) -> Lines {
        let mut out = vec![Line::default()];
        out.extend(indent(
            ui::card(&sh.theme, title, body, w.saturating_sub(4), true),
            2,
        ));
        out
    }

    fn setup_view(&self, sh: &Shared, w: usize) -> Lines {
        let th = &sh.theme;
        if self.checkpoint {
            let ceilings = checkpoint::ceiling_modules(&sh.app.catalog);
            let label = ceilings
                .get(self.ceil_idx)
                .map_or("your recent work", |m| m.title.as_str());
            let body = vec![
                Line::from(vec![
                    Span::raw("This short check-in covers what you have been practicing through "),
                    Span::styled(label.to_string(), th.accent),
                    Span::raw("."),
                ]),
                Line::from(
                    "It is not an exam. It is a quick pulse check so we can keep your plan personal.",
                ),
                Line::from(
                    "You will see the module name, but the technique stays hidden. Hints are welcome.",
                ),
                Line::default(),
                Line::from(vec![
                    Span::styled("enter", th.accent),
                    Span::raw(" begin the check-in    "),
                    Span::styled("esc", th.muted),
                    Span::raw(" go back"),
                ]),
            ];
            return self.card(sh, "practice check-in", body, w);
        }
        let body = vec![
            Line::from(vec![
                Span::raw("You will have "),
                Span::styled("45 minutes", th.title),
                Span::raw(
                    ". Treat it like a real interview: the module and technique stay hidden.",
                ),
            ]),
            Line::from(vec![
                Span::raw("Each hint costs "),
                Span::styled("three minutes", th.due),
                Span::raw(". Please do not open the reference solution during the round."),
            ]),
            Line::default(),
            Line::from(vec![
                Span::raw("Number of problems  "),
                self.choice(sh, 1),
                Span::raw(" "),
                self.choice(sh, 2),
                Span::raw(" "),
                self.choice(sh, 3),
            ]),
        ];
        self.card(sh, "mock interview", body, w)
    }

    fn round_view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        if self.confirm {
            let body = vec![
                Line::from("Every unsubmitted problem counts as given up."),
                Line::default(),
                Line::from(vec![
                    Span::styled("y", th.accent),
                    Span::raw(" abandon    "),
                    Span::styled("n", th.accent),
                    Span::raw(" keep going"),
                ]),
            ];
            return ui::modal_tone(th, "abandon round", body, w, h, Tone::Fail);
        }
        let mut left = vec![Span::raw("  ")];
        for i in 0..self.foci.len() {
            if i > 0 {
                left.push(Span::raw(" "));
            }
            left.push(if self.done[i] {
                Span::styled("●", th.pass)
            } else if i == self.cur {
                Span::styled("●", th.accent)
            } else {
                Span::styled("○", th.muted)
            });
        }
        let label = if self.checkpoint {
            let m = sh.app.catalog.module_of(&self.foci[self.cur].p);
            format!(
                "  {} · {} of {}",
                m.title.to_lowercase(),
                self.cur + 1,
                self.foci.len()
            )
        } else {
            format!("  problem {} of {}", self.cur + 1, self.foci.len())
        };
        left.push(Span::styled(label, th.muted));
        let rem = self.remaining(sh);
        let style = if rem < RED_UNDER {
            th.fail.add_modifier(Modifier::BOLD)
        } else {
            th.title
        };
        let clock = Line::from(vec![
            Span::styled(format!("{} remaining", mmss(rem)), style),
            Span::raw("  "),
        ]);
        let status = ui::truncate(spread(Line::from(left), clock, w), w);
        let mut out = vec![Line::default(), status];
        // Focus's first line is its top margin; the status line takes its place.
        out.extend(
            self.foci[self.cur]
                .view(sh, w, h.saturating_sub(2))
                .into_iter()
                .skip(1),
        );
        out
    }

    fn self_check_view(&self, sh: &Shared, w: usize) -> Lines {
        let th = &sh.theme;
        let body = SELF_CHECKS
            .iter()
            .zip(self.checks)
            .enumerate()
            .map(|(i, (item, on))| {
                let bx = if on {
                    Span::styled("[x]", th.pass)
                } else {
                    Span::styled("[ ]", th.muted)
                };
                Line::from(vec![
                    Span::styled(format!("{} ", i + 1), th.accent),
                    bx,
                    Span::raw(format!(" {item}")),
                ])
            })
            .collect();
        self.card(sh, "round over · be honest", body, w)
    }

    fn level_label(sh: &Shared, lv: Level) -> Span<'static> {
        let th = &sh.theme;
        let style = match lv {
            Level::Strong => th.pass,
            Level::Shaky => th.due,
            Level::StartHere => th.fail,
        };
        Span::styled(lv.as_str(), style)
    }

    fn checkpoint_reveal(&self, sh: &Shared, w: usize) -> Lines {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let items = self.results(sh);
        let mut body: Lines = items
            .iter()
            .map(|it| {
                Line::from(vec![
                    Span::raw(format!("{:<20}  ", it.topic)),
                    Self::level_label(sh, it.level),
                ])
            })
            .collect();
        body.push(Line::default());
        let r = checkpoint::Result {
            through: self.through,
            items,
        };
        body.push(match checkpoint::recommend(c, &r) {
            Some(m) => Line::from(vec![
                Span::styled("Based on this check-in, we will emphasize ", th.muted),
                Span::styled(m.title.to_lowercase(), th.accent),
                Span::styled(" in your plan.", th.muted),
            ]),
            None => Line::styled(
                "Nice work on that slice of the curriculum. Keep going, and we'll keep adapting your plan.",
                th.muted,
            ),
        });
        let title = checkpoint::module_title(c, self.through).map_or_else(
            || "check-in results".into(),
            |n| format!("check-in through {n}"),
        );
        self.card(sh, &title, body, w)
    }

    fn mock_reveal(&self, sh: &Shared, w: usize) -> Lines {
        let th = &sh.theme;
        let c = &sh.app.catalog;
        let mut out = vec![Line::default()];
        for (i, f) in self.foci.iter().enumerate() {
            let time = Span::styled(format!("  {}", mmss(self.times[i])), th.muted);
            let result = if self.passed[i] {
                Line::from(vec![Span::styled("✓ passed", th.pass), time])
            } else {
                Line::from(vec![Span::styled("✗ not passed", th.fail), time])
            };
            let place = format!(
                "{} · {}",
                c.module_of(&f.p).title,
                c.technique_of(&f.p).title
            );
            let body = vec![Line::styled(place, th.muted), result];
            let inner = w.saturating_sub(4);
            let card = if self.passed[i] {
                ui::card_tone(th, &f.p.title, body, inner, Tone::Pass)
            } else {
                ui::card(th, &f.p.title, body, inner, false)
            };
            out.extend(indent(card, 2));
        }
        out
    }
}

impl Screen for Interview {
    fn title(&self) -> String {
        if self.checkpoint {
            "check-in".into()
        } else {
            "timed".into()
        }
    }

    /// Check-ins stay on Today (like placement); only mock interviews use Timed.
    fn tab(&self) -> Option<usize> {
        Some(if self.checkpoint { 0 } else { 2 })
    }

    fn owns_key(&self, key: &str) -> bool {
        match self.phase {
            Phase::Round => key != "?",
            Phase::SelfCheck | Phase::Reveal => key != "?" && key != "q",
            Phase::Setup => matches!(
                key,
                "1" | "2" | "3" | "left" | "right" | "h" | "l" | "enter" | "esc"
            ),
        }
    }

    fn help(&self) -> Lines {
        let lines: [&str; 3] = if self.checkpoint {
            [
                "setup:  enter start the recommended checkpoint  esc back",
                "round:  e edit  t hint  tab next  space submit  q abandon",
                "after:  enter go back (we will refresh your plan)",
            ]
        } else {
            [
                "setup:  1-3 or ←/→ problems, enter to start",
                "round:  e edit  t hint (+3:00)  tab next  space submit  q abandon",
                "after:  1-4 tick the self-check, enter to reveal",
            ]
        };
        lines.into_iter().map(Line::from).collect()
    }

    fn keys(&self) -> Vec<Key> {
        match self.phase {
            Phase::Round => {
                let hint = if self.checkpoint {
                    "hint"
                } else {
                    "hint +3:00"
                };
                vec![
                    Key::new("e", "edit"),
                    Key::new("space", "submit"),
                    Key::new("tab", "next"),
                    Key::new("t", hint),
                    Key::new("q", "abandon"),
                ]
            }
            Phase::SelfCheck => vec![Key::new("1-4", "tick"), Key::new("enter", "reveal")],
            Phase::Reveal => vec![Key::new("enter", "done")],
            Phase::Setup if self.checkpoint => {
                vec![Key::new("enter", "begin"), Key::new("esc", "back")]
            }
            Phase::Setup => vec![Key::new("1-3", "problems"), Key::new("enter", "start")],
        }
    }

    fn wants_mouse(&self) -> bool {
        self.phase == Phase::Round
    }

    fn close(&mut self, sh: &mut Shared) {
        if self.phase == Phase::Round {
            self.end_round(sh);
        }
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let cmd = self.handle(sh, msg);
        self.sync_clocks(sh);
        cmd
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        match self.phase {
            Phase::Setup => self.setup_view(sh, w),
            Phase::Round => self.round_view(sh, w, h),
            Phase::SelfCheck => self.self_check_view(sh, w),
            Phase::Reveal if self.checkpoint => self.checkpoint_reveal(sh, w),
            Phase::Reveal => self.mock_reveal(sh, w),
        }
    }
}

#[cfg(test)]
mod tests;
