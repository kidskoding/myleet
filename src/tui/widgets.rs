use std::collections::HashMap;

use jiff::SignedDuration;
use jiff::civil::Date;
use ratatui::text::{Line, Span};

use super::theme::Theme;
use super::ui::{self, BadgeKind, Lines};
use crate::catalog::Difficulty;
use crate::schedule::{State, Status};

pub fn spread(left: Line<'static>, right: Line<'static>, w: usize) -> Line<'static> {
    let gap = w as isize - left.width() as isize - right.width() as isize;
    let mut spans = left.spans;
    spans.push(Span::raw(" ".repeat(gap.max(1) as usize)));
    spans.extend(right.spans);
    Line::from(spans)
}

pub fn glyph(th: &Theme, st: Status) -> Span<'static> {
    match st {
        Status::Learning => Span::styled("○", th.due),
        Status::Reviewing => Span::styled("◐", th.accent),
        Status::Mastered => Span::styled("●", th.pass),
        Status::Unseen => Span::styled("·", th.muted),
    }
}

pub fn status_of(states: &HashMap<String, State>, id: &str) -> State {
    states.get(id).cloned().unwrap_or_default()
}

/// Formats a day as `mon jan 2`.
pub fn date_label(d: Date) -> String {
    d.strftime("%a %b %-d").to_string().to_lowercase()
}

pub fn mmss(d: SignedDuration) -> String {
    let secs = d.as_secs().max(0);
    format!("{:02}:{:02}", secs / 60, secs % 60)
}

pub const TAB_BAR_HEIGHT: usize = 2;

pub fn scroll_window(cursor: usize, offset: usize, rows: usize) -> usize {
    if rows == 0 || cursor < offset {
        return cursor;
    }
    if cursor >= offset + rows {
        return cursor + 1 - rows;
    }
    offset
}

pub fn fit_height(mut lines: Lines, n: usize) -> Lines {
    lines.resize(n, Line::default());
    lines
}

pub fn plural(n: i64, one: &str, many: &str) -> String {
    format!("{n} {}", if n == 1 { one } else { many })
}

pub fn frac(n: usize, total: usize) -> f64 {
    if total == 0 {
        return 0.0;
    }
    n as f64 / total as f64
}

pub fn indent(block: Lines, n: usize) -> Lines {
    block
        .into_iter()
        .map(|l| {
            let mut spans = vec![Span::raw(" ".repeat(n))];
            spans.extend(l.spans);
            Line::from(spans)
        })
        .collect()
}

pub fn difficulty_badge(th: &Theme, d: Difficulty) -> Span<'static> {
    match d {
        Difficulty::Easy => ui::badge(th, "easy", BadgeKind::Easy),
        Difficulty::Hard => ui::badge(th, "hard", BadgeKind::Hard),
        Difficulty::Medium => ui::badge(th, "med ", BadgeKind::Medium),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tui::ui::plain;

    #[test]
    fn helpers() {
        let l = spread(Line::from("ab"), Line::from("cd"), 10);
        assert_eq!(plain(&l), "ab      cd");
        assert_eq!(
            plain(&spread(Line::from("abc"), Line::from("d"), 2)),
            "abc d"
        );
        assert_eq!(mmss(SignedDuration::from_secs(125)), "02:05");
        assert_eq!(mmss(SignedDuration::from_secs(-3)), "00:00");
        assert_eq!(date_label(jiff::civil::date(2026, 11, 2)), "mon nov 2");
        assert_eq!(scroll_window(10, 0, 5), 6);
        assert_eq!(scroll_window(1, 3, 5), 1);
        assert_eq!(scroll_window(4, 3, 5), 3);
        assert_eq!(plural(1, "day", "days"), "1 day");
        assert_eq!(plural(2, "day", "days"), "2 days");
        assert_eq!(frac(1, 0), 0.0);
        assert_eq!(fit_height(vec![Line::from("a")], 3).len(), 3);
        assert_eq!(plain(&indent(vec![Line::from("x")], 2)[0]), "  x");
        assert_eq!(
            difficulty_badge(&Theme::new(), Difficulty::Medium).content,
            " med  "
        );
    }
}
