//! The round opens one problem at a time through `screens::new_focus` (it is sequential, so each problem's clock starts when reached) and learns progress from [`FocusStatus`] messages.

use jiff::{SignedDuration, Timestamp};
use ratatui::text::{Line, Span};

use super::app::{Cmd, Msg, Screen, Shared};
use super::home::{marker, now, record};
use super::screens;
use super::ui::{self, Key, Lines};
use super::widgets::indent;
use crate::placement::{self as place, ItemResult, Level, Outcome, Slot};
use crate::progress::{Event, kind, mode};

/// What an exam-mode Focus (placement, checkpoint, interview) reports about
/// its attempt. Focus sends it through `Shared::after(Duration::ZERO, ..)` or
/// `Shared::sender()` as `Msg::Custom` once it has recorded `opened`, after
/// every finished test run, and after every revealed hint. The embedding
/// screen records the attempt's final event (`passed`/`gave_up`/`left`) with
/// `attempt`, so exam-mode Focus must not record those itself.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FocusStatus {
    pub problem_id: String,
    pub attempt: String,
    pub green: bool,
    pub hints: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    Intro,
    Round,
    Reveal,
}

struct Topic {
    topic: &'static str,
    problem_id: String,
    module_id: String,
}

pub struct Placement {
    phase: Phase,
    slots: Vec<Slot>,
    items: Vec<Topic>,
    /// The open problem, always `items[cur]` during the round.
    focus: Option<Box<dyn Screen>>,
    live: Option<FocusStatus>,
    cur: usize,
    done: Vec<bool>,
    outcomes: Vec<Outcome>,
    since: Timestamp,
    confirm: bool,
    begin_on_init: bool,
}

impl Placement {
    /// The intro card, for callers that have not shown Today's gate.
    pub fn new() -> Placement {
        Placement::with_slots(place::DEFAULT_SLOTS.to_vec())
    }

    /// Already in the round once pushed (Today's gate is the intro).
    pub fn start() -> Placement {
        Placement {
            begin_on_init: true,
            ..Placement::new()
        }
    }

    fn with_slots(slots: Vec<Slot>) -> Placement {
        Placement {
            phase: Phase::Intro,
            slots,
            items: Vec::new(),
            focus: None,
            live: None,
            cur: 0,
            done: Vec::new(),
            outcomes: Vec::new(),
            since: Timestamp::UNIX_EPOCH,
            confirm: false,
            begin_on_init: false,
        }
    }

    fn begin(&mut self, sh: &mut Shared) -> Cmd {
        let c = &sh.app.catalog;
        self.items = place::resolve(c, &self.slots)
            .into_iter()
            .map(|it| Topic {
                topic: it.topic,
                problem_id: it.problem.id.clone(),
                module_id: c.module_of(it.problem).id.clone(),
            })
            .collect();
        if self.items.is_empty() {
            sh.toast("no placement problems in this catalog");
            return Cmd::None;
        }
        self.phase = Phase::Round;
        self.done = vec![false; self.items.len()];
        self.outcomes = vec![Outcome::Skipped; self.items.len()];
        self.open(sh, 0)
    }

    fn open(&mut self, sh: &mut Shared, i: usize) -> Cmd {
        if let Some(mut f) = self.focus.take() {
            f.close(sh);
        }
        self.cur = i;
        self.since = now(sh);
        self.live = None;
        let mut f = screens::new_focus(sh, &self.items[i].problem_id, mode::PLACEMENT);
        let cmd = f.init(sh);
        self.focus = Some(f);
        cmd
    }

    fn submit(&mut self, sh: &mut Shared, i: usize, skipped: bool) {
        if self.done[i] {
            return;
        }
        self.done[i] = true;
        let id = self.items[i].problem_id.clone();
        let opened = i == self.cur && self.focus.is_some();
        let elapsed = if opened {
            now(sh).duration_since(self.since)
        } else {
            SignedDuration::ZERO
        };
        let live = self.live.clone().filter(|s| opened && s.problem_id == id);
        let (green, hints) = live.as_ref().map_or((false, 0), |s| (s.green, s.hints));
        let outcome = place::score(
            green && !skipped,
            hints,
            skipped,
            elapsed > sh.app.target(&id),
        );
        self.outcomes[i] = outcome;
        // A problem never reached has no attempt to close.
        let Some(live) = live else {
            return;
        };
        let (kind, data) = match outcome {
            Outcome::Clean | Outcome::Hinted => (
                kind::PASSED,
                [("elapsed_ms".to_string(), elapsed.as_millis().to_string())].into(),
            ),
            Outcome::Skipped => (kind::LEFT, Default::default()),
            Outcome::Failed => (kind::GAVE_UP, Default::default()),
        };
        let e = Event {
            time: now(sh),
            kind: kind.into(),
            problem: id,
            attempt: live.attempt,
            mode: mode::PLACEMENT.into(),
            data,
        };
        record(sh, e);
    }

    fn results(&self) -> Vec<ItemResult> {
        self.items
            .iter()
            .zip(&self.outcomes)
            .map(|(it, &o)| ItemResult {
                topic: it.topic.to_string(),
                problem_id: it.problem_id.clone(),
                module_id: it.module_id.clone(),
                outcome: o,
                level: place::level_of(o),
            })
            .collect()
    }

    fn finish(&mut self, sh: &mut Shared) {
        for i in 0..self.items.len() {
            self.submit(sh, i, true);
        }
        if let Some(mut f) = self.focus.take() {
            f.close(sh);
        }
        let mut e = marker(sh, kind::PLACEMENT_DONE, mode::PLACEMENT, Vec::new());
        e.data = place::encode(&self.results());
        record(sh, e);
        self.phase = Phase::Reveal;
    }

    fn skip_all(&self, sh: &mut Shared) {
        let e = marker(
            sh,
            kind::PLACEMENT_DONE,
            mode::PLACEMENT,
            vec![("skipped", "1".into())],
        );
        record(sh, e);
    }

    fn recommended(&self, sh: &Shared) -> Option<String> {
        let r = place::Result {
            skipped: false,
            items: self.results(),
        };
        place::recommend(&sh.app.catalog, &r).map(|m| m.title.to_lowercase())
    }

    fn toast_handoff(&self, sh: &mut Shared) {
        match self.recommended(sh) {
            Some(m) if !self.items.is_empty() => {
                sh.toast(format!("We will start your plan with {m}"));
            }
            _ => sh.toast("Your practice plan is ready"),
        }
    }

    fn advance(&mut self, sh: &mut Shared, skipped: bool) -> Cmd {
        self.submit(sh, self.cur, skipped);
        let n = self.items.len();
        match (1..=n).map(|d| (self.cur + d) % n).find(|&i| !self.done[i]) {
            Some(next) => self.open(sh, next),
            None => {
                self.finish(sh);
                Cmd::None
            }
        }
    }

    fn level_label(&self, sh: &Shared, lv: Level) -> Span<'static> {
        let th = &sh.theme;
        let style = match lv {
            Level::Strong => th.pass,
            Level::Shaky => th.due,
            Level::StartHere => th.fail,
        };
        Span::styled(lv.as_str(), style)
    }

    fn round_view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        if self.confirm {
            let body = vec![
                Line::from(
                    "We will skip the problems you have not finished and use what you have already done.",
                ),
                Line::default(),
                Line::from(vec![
                    Span::styled("y", th.accent),
                    Span::raw(" finish early    "),
                    Span::styled("n", th.accent),
                    Span::raw(" keep going"),
                ]),
            ];
            return ui::modal(th, "finish early?", body, w, h);
        }
        let mut spans = vec![Span::raw("  ")];
        for i in 0..self.items.len() {
            if i > 0 {
                spans.push(Span::raw(" "));
            }
            spans.push(if self.done[i] {
                Span::styled("●", th.pass)
            } else if i == self.cur {
                Span::styled("●", th.accent)
            } else {
                Span::styled("○", th.muted)
            });
        }
        spans.push(Span::styled(
            format!(
                "  {} · {} of {}",
                self.items[self.cur].topic,
                self.cur + 1,
                self.items.len()
            ),
            th.muted,
        ));
        let mut out = vec![Line::default(), ui::truncate(Line::from(spans), w)];
        if let Some(f) = &self.focus {
            // Focus's first line is its top margin; the step header takes its place.
            out.extend(f.view(sh, w, h.saturating_sub(2)).into_iter().skip(1));
        }
        out
    }

    fn reveal_view(&self, sh: &Shared, card_w: usize) -> Lines {
        let th = &sh.theme;
        let mut body: Lines = self
            .results()
            .into_iter()
            .map(|it| {
                Line::from(vec![
                    Span::raw(format!("{:<18}  ", it.topic)),
                    self.level_label(sh, it.level),
                ])
            })
            .collect();
        body.push(Line::default());
        match self.recommended(sh) {
            Some(m) => {
                body.push(Line::from(vec![
                    Span::styled("Great work. We recommend starting with ", th.muted),
                    Span::styled(m, th.accent),
                    Span::styled(".", th.muted),
                ]));
                body.push(Line::styled(
                    "We will put those topics first in your practice plan.",
                    th.muted,
                ));
            }
            None => {
                body.push(Line::styled(
                    "You look solid across these topics. Explore the map when you are ready,",
                    th.muted,
                ));
                body.push(Line::styled(
                    "and we will keep adapting your plan as you practice.",
                    th.muted,
                ));
            }
        }
        let mut out = vec![Line::default()];
        out.extend(indent(
            ui::card(th, "your placement results", body, card_w, true),
            2,
        ));
        out
    }
}

impl Default for Placement {
    fn default() -> Self {
        Self::new()
    }
}

impl Screen for Placement {
    fn title(&self) -> String {
        "placement".into()
    }

    fn tab(&self) -> Option<usize> {
        Some(0)
    }

    fn init(&mut self, sh: &mut Shared) -> Cmd {
        if self.begin_on_init {
            self.begin_on_init = false;
            return self.begin(sh);
        }
        Cmd::None
    }

    fn owns_key(&self, key: &str) -> bool {
        match self.phase {
            Phase::Round => key != "?",
            Phase::Intro | Phase::Reveal => key != "?" && key != "q",
        }
    }

    fn help(&self) -> Lines {
        vec![
            Line::from("round:  e edit  t hint  space submit  n skip topic  q abandon"),
            Line::from("after:  enter back to today"),
        ]
    }

    fn keys(&self) -> Vec<Key> {
        match self.phase {
            Phase::Round => vec![
                Key::new("e", "edit"),
                Key::new("space", "submit"),
                Key::new("n", "skip"),
                Key::new("t", "hint"),
                Key::new("q", "abandon"),
            ],
            Phase::Reveal => vec![Key::new("enter", "back to today")],
            Phase::Intro => vec![Key::new("enter", "begin"), Key::new("n", "skip for now")],
        }
    }

    fn close(&mut self, sh: &mut Shared) {
        if self.phase == Phase::Round {
            self.finish(sh);
        }
    }

    fn update(&mut self, sh: &mut Shared, msg: &Msg) -> Cmd {
        let Msg::Key(k) = msg else {
            if let Msg::Custom(any) = msg
                && let Some(st) = any.downcast_ref::<FocusStatus>()
            {
                self.live = Some(st.clone());
            }
            return match &mut self.focus {
                Some(f) => f.update(sh, msg),
                None => Cmd::None,
            };
        };
        let key = k.name.as_str();
        match self.phase {
            Phase::Intro => match key {
                "enter" => return self.begin(sh),
                "n" | "esc" => {
                    self.skip_all(sh);
                    return Cmd::Pop;
                }
                _ => {}
            },
            Phase::Round => {
                if self.confirm {
                    self.confirm = false;
                    if key == "y" {
                        self.finish(sh);
                    }
                    return Cmd::None;
                }
                match key {
                    "q" => self.confirm = true,
                    "n" => return self.advance(sh, true),
                    "space" => return self.advance(sh, false),
                    "esc" | "g" | "s" | "/" => {}
                    _ => {
                        if let Some(f) = &mut self.focus {
                            return f.update(sh, msg);
                        }
                    }
                }
            }
            Phase::Reveal => {
                if key == "enter" || key == "esc" {
                    self.toast_handoff(sh);
                    return Cmd::Pop;
                }
            }
        }
        Cmd::None
    }

    fn view(&self, sh: &Shared, w: usize, h: usize) -> Lines {
        let th = &sh.theme;
        let card_w = w.saturating_sub(4);
        match self.phase {
            Phase::Round => self.round_view(sh, w, h),
            Phase::Reveal => self.reveal_view(sh, card_w),
            Phase::Intro => {
                let mut body: Lines = [
                    "We will walk you through a few easy problems with interview-style timers.",
                    "You will see one each from arrays, two pointers, trees, graphs, and binary search.",
                    "Each has a timer (usually 15 minutes). Going over or using a hint counts as shaky.",
                    "Skip any topic you want.",
                    "",
                ]
                .iter()
                .map(|l| Line::from(*l))
                .collect();
                body.push(Line::from(vec![
                    Span::styled("enter", th.accent),
                    Span::raw(" begin the warm-up    "),
                    Span::styled("n", th.accent),
                    Span::raw(" skip for now"),
                ]));
                let mut out = vec![Line::default()];
                out.extend(indent(
                    ui::card(th, "placement warm-up", body, card_w, true),
                    2,
                ));
                out
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use jiff::ToSpan;

    use super::*;
    use crate::schedule;
    use crate::tui::app::{App as Frame, KeyPress};
    use crate::tui::home::fixtures::*;
    use crate::tui::theme::assert_palette;
    use crate::tui::ui::plain;

    const SLOTS: &[Slot] = &[
        Slot {
            topic: "arrays",
            prefer: &["p-one"],
        },
        Slot {
            topic: "hashing",
            prefer: &["two-sum"],
        },
    ];

    fn key(pl: &mut Placement, sh: &mut Shared, name: &str) -> Cmd {
        pl.update(sh, &Msg::Key(KeyPress::named(name)))
    }

    fn status(pl: &mut Placement, sh: &mut Shared, id: &str, green: bool, hints: u32) {
        let st = FocusStatus {
            problem_id: id.into(),
            attempt: format!("att-{id}"),
            green,
            hints,
        };
        pl.update(sh, &Msg::Custom(Box::new(st)));
    }

    fn round() -> (Placement, Shared) {
        let mut sh = shared_with(Vec::new());
        let mut pl = Placement::with_slots(SLOTS.to_vec());
        key(&mut pl, &mut sh, "enter");
        (pl, sh)
    }

    fn text(pl: &Placement, sh: &Shared, w: usize, h: usize) -> String {
        let lines = pl.view(sh, w, h);
        assert_palette(&lines);
        lines.iter().map(plain).collect::<Vec<_>>().join("\n")
    }

    #[test]
    fn round_shows_steps() {
        let (pl, sh) = round();
        assert_eq!(pl.phase, Phase::Round);
        assert!(pl.focus.is_some());
        let view = text(&pl, &sh, 80, 21);
        assert!(view.contains("● ○  arrays · 1 of 2"), "{view}");
    }

    #[test]
    fn submit_scores_and_reveals() {
        let (mut pl, mut sh) = round();
        status(&mut pl, &mut sh, "p-one", true, 0);
        key(&mut pl, &mut sh, "space");
        assert!(text(&pl, &sh, 80, 21).contains("hashing · 2 of 2"));
        status(&mut pl, &mut sh, "two-sum", false, 0);
        key(&mut pl, &mut sh, "space");
        assert_eq!(pl.phase, Phase::Reveal);
        assert_eq!(pl.outcomes, [Outcome::Clean, Outcome::Failed]);
        let view = text(&pl, &sh, 80, 21);
        for want in ["your placement results", "strong", "start here"] {
            assert!(view.contains(want), "missing {want:?}:\n{view}");
        }
        assert!(place::done(&sh.app.events));
        assert!(
            sh.app
                .attempts()
                .iter()
                .all(|a| a.outcome == schedule::Outcome::None),
            "placement must not move the ladder"
        );
        let finals: Vec<(&str, &str, &str)> = sh
            .app
            .events
            .iter()
            // Focus records `opened` itself; placement owns the final outcome events.
            .filter(|e| !e.problem.is_empty() && e.kind != kind::OPENED)
            .map(|e| (e.kind.as_str(), e.attempt.as_str(), e.mode.as_str()))
            .collect();
        assert_eq!(
            finals,
            [
                (kind::PASSED, "att-p-one", mode::PLACEMENT),
                (kind::GAVE_UP, "att-two-sum", mode::PLACEMENT)
            ]
        );
        let r = place::load(&sh.app.events).unwrap();
        assert_eq!(r.items[0].level, Level::Strong);
        assert_eq!(r.items[1].level, Level::StartHere);
    }

    #[test]
    fn hints_and_overtime_are_shaky() {
        let (mut pl, mut sh) = round();
        status(&mut pl, &mut sh, "p-one", true, 1);
        key(&mut pl, &mut sh, "space");
        status(&mut pl, &mut sh, "two-sum", true, 0);
        set_now(&mut sh, test_now() + 2.hours());
        key(&mut pl, &mut sh, "space");
        assert_eq!(pl.outcomes, [Outcome::Hinted, Outcome::Hinted]);
        let passed = sh
            .app
            .events
            .iter()
            .find(|e| e.problem == "two-sum" && e.kind == kind::PASSED)
            .unwrap();
        assert_eq!(passed.data["elapsed_ms"], "7200000");
    }

    #[test]
    fn stale_status_is_ignored() {
        let (mut pl, mut sh) = round();
        status(&mut pl, &mut sh, "two-sum", true, 0);
        key(&mut pl, &mut sh, "space");
        assert_eq!(
            pl.outcomes[0],
            Outcome::Failed,
            "a status for another problem"
        );
    }

    #[test]
    fn skip_topics() {
        let (mut pl, mut sh) = round();
        status(&mut pl, &mut sh, "p-one", true, 0);
        key(&mut pl, &mut sh, "n");
        key(&mut pl, &mut sh, "n");
        assert_eq!(pl.phase, Phase::Reveal);
        assert_eq!(pl.outcomes, [Outcome::Skipped, Outcome::Skipped]);
        let left = sh
            .app
            .events
            .iter()
            .filter(|e| e.kind == kind::LEFT)
            .count();
        assert_eq!(left, 1, "only the opened problem had an attempt to leave");
    }

    #[test]
    fn abandon_confirms_then_finishes() {
        let (mut pl, mut sh) = round();
        key(&mut pl, &mut sh, "q");
        assert!(text(&pl, &sh, 80, 21).contains("finish early?"));
        key(&mut pl, &mut sh, "n");
        assert_eq!(pl.phase, Phase::Round, "any other key keeps going");
        status(&mut pl, &mut sh, "p-one", true, 0);
        key(&mut pl, &mut sh, "q");
        key(&mut pl, &mut sh, "y");
        assert_eq!(pl.phase, Phase::Reveal);
        assert_eq!(pl.outcomes, [Outcome::Skipped, Outcome::Skipped]);
        assert!(place::done(&sh.app.events));
    }

    #[test]
    fn close_mid_round_records_results() {
        let (mut pl, mut sh) = round();
        pl.close(&mut sh);
        assert!(place::done(&sh.app.events));
        assert!(pl.focus.is_none());
    }

    #[test]
    fn round_swallows_leave_keys() {
        let (mut pl, mut sh) = round();
        for k in ["esc", "g", "s", "/"] {
            assert!(matches!(key(&mut pl, &mut sh, k), Cmd::None), "{k}");
        }
        assert_eq!(pl.phase, Phase::Round);
        assert!(pl.owns_key("q") && pl.owns_key("1") && !pl.owns_key("?"));
    }

    #[test]
    fn intro_skip_persists() {
        let mut sh = shared_with(Vec::new());
        let mut pl = Placement::new();
        assert!(text(&pl, &sh, 80, 21).contains("placement warm-up"));
        assert!(matches!(key(&mut pl, &mut sh, "n"), Cmd::Pop));
        assert!(place::load(&sh.app.events).unwrap().skipped);
    }

    #[test]
    fn reveal_toasts_handoff() {
        let (mut pl, mut sh) = round();
        status(&mut pl, &mut sh, "p-one", true, 0);
        key(&mut pl, &mut sh, "space");
        key(&mut pl, &mut sh, "space");
        assert!(text(&pl, &sh, 80, 21).contains("We recommend starting with"));
        assert!(matches!(key(&mut pl, &mut sh, "enter"), Cmd::Pop));
        assert!(
            sh.toast_text().starts_with("We will start your plan with"),
            "{}",
            sh.toast_text()
        );
    }

    #[test]
    fn all_strong_reads_solid() {
        let (mut pl, mut sh) = round();
        for id in ["p-one", "two-sum"] {
            status(&mut pl, &mut sh, id, true, 0);
            key(&mut pl, &mut sh, "space");
        }
        assert!(text(&pl, &sh, 80, 21).contains("You look solid"));
        key(&mut pl, &mut sh, "enter");
        assert_eq!(sh.toast_text(), "Your practice plan is ready");
    }

    #[test]
    fn start_skips_intro_from_today() {
        let mut f = Frame::new(shared_with(Vec::new()));
        f.update(Msg::Key(KeyPress::named("enter")));
        assert_eq!(f.top().title(), "placement");
        // The good fixture has one default-slot problem (two-sum).
        let view = screen(&mut f, 80, 24);
        assert!(view.contains("arrays and hashing · 1 of 1"), "{view}");
        assert!(view.contains("space submit"), "{view}");
        f.update(Msg::Key(KeyPress::named("n")));
        assert!(screen(&mut f, 80, 24).contains("your placement results"));
        f.update(Msg::Key(KeyPress::named("enter")));
        assert_eq!(f.depth(), 1);
        assert!(screen(&mut f, 80, 24).contains("╭─ today"), "gate gone");
    }

    #[test]
    fn empty_catalog_stays_on_intro() {
        let mut sh = shared_with(Vec::new());
        let mut pl = Placement::with_slots(vec![Slot {
            topic: "nothing",
            prefer: &["no-such-problem"],
        }]);
        key(&mut pl, &mut sh, "enter");
        assert_eq!(pl.phase, Phase::Intro);
        assert_eq!(sh.toast_text(), "no placement problems in this catalog");
    }

    #[test]
    fn views_fit() {
        let (mut pl, mut sh) = round();
        for (w, h) in [(60, 17), (80, 21), (160, 37)] {
            let lines = pl.view(&sh, w, h);
            assert!(lines.len() <= h);
            assert!(lines.iter().all(|l| l.width() <= w));
        }
        key(&mut pl, &mut sh, "n");
        key(&mut pl, &mut sh, "n");
        assert!(pl.view(&sh, 60, 17).iter().all(|l| l.width() <= 60));
    }
}
