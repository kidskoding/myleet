//! The widget kit. Every widget returns styled lines (or a span) instead of
//! drawing into a buffer, so screens compose them the way the Go screens join
//! lipgloss strings; the frame draws the final lines once.

use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span, Text};
use unicode_width::UnicodeWidthChar;

use super::theme::Theme;

pub type Lines = Vec<Line<'static>>;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tone {
    Muted,
    Accent,
    Pass,
    Due,
    Fail,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BadgeKind {
    Review,
    New,
    Easy,
    Medium,
    Hard,
    Info,
}

/// One key-bar hint, e.g. `enter start`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Key {
    pub key: String,
    pub label: String,
}

impl Key {
    pub fn new(key: impl Into<String>, label: impl Into<String>) -> Key {
        Key {
            key: key.into(),
            label: label.into(),
        }
    }
}

pub fn tone_style(th: &Theme, t: Tone) -> Style {
    match t {
        Tone::Accent => th.accent,
        Tone::Pass => th.pass,
        Tone::Due => th.due,
        Tone::Fail => th.fail,
        Tone::Muted => th.muted,
    }
}

fn solid(style: Style) -> Style {
    style.add_modifier(Modifier::REVERSED | Modifier::BOLD)
}

fn char_width(c: char) -> usize {
    c.width().unwrap_or(0)
}

/// Display width of plain text (wide characters count as two columns).
pub fn str_width(s: &str) -> usize {
    s.chars().map(char_width).sum()
}

type Cell = (char, Style);

fn cells(line: &Line<'_>) -> Vec<Cell> {
    line.spans
        .iter()
        .flat_map(|s| {
            let st = line.style.patch(s.style);
            s.content.chars().map(move |c| (c, st))
        })
        .collect()
}

fn from_cells(cells: &[Cell]) -> Line<'static> {
    let mut spans: Vec<Span<'static>> = Vec::new();
    let mut text = String::new();
    let mut style = None;
    for &(c, st) in cells {
        if style.is_some_and(|s| s != st) {
            spans.push(Span::styled(
                std::mem::take(&mut text),
                style.unwrap_or_default(),
            ));
        }
        style = Some(st);
        text.push(c);
    }
    if let Some(st) = style {
        spans.push(Span::styled(text, st));
    }
    Line::from(spans)
}

fn cells_width(cells: &[Cell]) -> usize {
    cells.iter().map(|&(c, _)| char_width(c)).sum()
}

pub fn truncate(line: Line<'static>, width: usize) -> Line<'static> {
    if width == 0 {
        return Line::default();
    }
    if line.width() <= width {
        return line;
    }
    let mut kept = Vec::new();
    let mut w = 0;
    for (c, st) in cells(&line) {
        let cw = char_width(c);
        if w + cw > width - 1 {
            break;
        }
        w += cw;
        kept.push((c, st));
    }
    let tail = kept.last().map_or(Style::new(), |&(_, st)| st);
    kept.push(('…', tail));
    from_cells(&kept)
}

pub fn pad(line: Line<'static>, width: usize) -> Line<'static> {
    if width == 0 {
        return Line::default();
    }
    let mut line = truncate(line, width);
    let gap = width.saturating_sub(line.width());
    if gap > 0 {
        line.spans.push(Span::raw(" ".repeat(gap)));
    }
    line
}

/// Word-wraps a line to width, keeping its styles. Empty input stays one blank
/// line; a word longer than the width is broken rather than truncated.
pub fn wrap_lines(line: Line<'static>, width: usize) -> Lines {
    if width == 0 {
        return Vec::new();
    }
    let all = cells(&line);
    if all.is_empty() {
        return vec![Line::default()];
    }
    let mut out: Vec<Vec<Cell>> = Vec::new();
    let mut cur: Vec<Cell> = Vec::new();
    let mut cur_w = 0;
    let mut space: Vec<Cell> = Vec::new();
    let mut rest = &all[..];
    while !rest.is_empty() {
        let is_space = rest[0].0 == ' ';
        let n = rest
            .iter()
            .take_while(|&&(c, _)| (c == ' ') == is_space)
            .count();
        let (tok, tail) = rest.split_at(n);
        rest = tail;
        if is_space {
            if out.is_empty() && cur.is_empty() {
                // Leading indentation belongs to the first line.
                cur.extend_from_slice(tok);
                cur_w = cells_width(tok);
            } else {
                space = tok.to_vec();
            }
            continue;
        }
        let ww = cells_width(tok);
        let sw = cells_width(&space);
        if cur_w + sw + ww <= width {
            cur.append(&mut space);
            cur.extend_from_slice(tok);
            cur_w += sw + ww;
        } else {
            space.clear();
            if cur_w > 0 {
                out.push(std::mem::take(&mut cur));
                cur_w = 0;
            }
            for &(c, st) in tok {
                let cw = char_width(c);
                if cur_w + cw > width && cur_w > 0 {
                    out.push(std::mem::take(&mut cur));
                    cur_w = 0;
                }
                cur.push((c, st));
                cur_w += cw;
            }
        }
    }
    out.push(cur);
    out.iter().map(|c| from_cells(c)).collect()
}

fn text_lines(body: impl Into<Text<'static>>) -> Lines {
    let text = body.into();
    if text.lines.is_empty() {
        return vec![Line::default()];
    }
    text.lines
}

pub fn card(
    th: &Theme,
    title: &str,
    body: impl Into<Text<'static>>,
    width: usize,
    active: bool,
) -> Lines {
    if active {
        card_with(th.accent, th.selected, title, body, width)
    } else {
        card_with(th.border, th.title, title, body, width)
    }
}

/// A card whose border and title take tone, e.g. a green success card.
pub fn card_tone(
    th: &Theme,
    title: &str,
    body: impl Into<Text<'static>>,
    width: usize,
    tone: Tone,
) -> Lines {
    let style = tone_style(th, tone);
    card_with(
        style,
        style.add_modifier(Modifier::BOLD),
        title,
        body,
        width,
    )
}

fn card_with(
    border: Style,
    title_style: Style,
    title: &str,
    body: impl Into<Text<'static>>,
    width: usize,
) -> Lines {
    let width = width.max(4);
    let inner = width - 2;
    let top = if title.is_empty() || inner < 6 {
        Line::from(Span::styled(format!("╭{}╮", "─".repeat(inner)), border))
    } else {
        let t = truncate(Line::from(title.to_string()), inner - 4);
        let fill = (inner - 3).saturating_sub(t.width());
        let mut spans = vec![Span::styled("╭─ ", border)];
        spans.extend(t.spans.into_iter().map(|s| s.patch_style(title_style)));
        spans.push(Span::styled(format!(" {}╮", "─".repeat(fill)), border));
        Line::from(spans)
    };
    let content = inner.saturating_sub(2);
    let mut out = vec![top];
    for line in text_lines(body) {
        for part in wrap_lines(line, content) {
            let mut spans = vec![Span::styled("│", border), Span::raw(" ")];
            spans.extend(pad(part, content).spans);
            spans.push(Span::raw(" "));
            spans.push(Span::styled("│", border));
            out.push(Line::from(spans));
        }
    }
    out.push(Line::from(Span::styled(
        format!("╰{}╯", "─".repeat(inner)),
        border,
    )));
    out
}

/// Badge uses reverse video so the pill takes the terminal's own colors.
pub fn badge(th: &Theme, text: &str, kind: BadgeKind) -> Span<'static> {
    let style = match kind {
        BadgeKind::Review | BadgeKind::Medium => th.due,
        BadgeKind::New => th.accent,
        BadgeKind::Easy => th.pass,
        BadgeKind::Hard => th.fail,
        BadgeKind::Info => th.muted,
    };
    Span::styled(format!(" {text} "), solid(style))
}

/// Chip is a solid reverse-video label; reverse keeps the terminal's own palette instead of setting a background.
pub fn chip(th: &Theme, text: &str, tone: Tone) -> Span<'static> {
    Span::styled(format!(" {text} "), solid(tone_style(th, tone)))
}

/// A solid reverse-video bar of exactly width columns with text centered.
pub fn block(th: &Theme, text: &str, width: usize, tone: Tone) -> Span<'static> {
    if width == 0 {
        return Span::raw("");
    }
    let text: String = truncate(Line::from(text.to_string()), width)
        .spans
        .iter()
        .map(|s| s.content.as_ref())
        .collect();
    let gap = width.saturating_sub(str_width(&text));
    let line = format!("{}{text}{}", " ".repeat(gap / 2), " ".repeat(gap - gap / 2));
    Span::styled(line, solid(tone_style(th, tone)))
}

pub fn bar(th: &Theme, frac: f64, width: usize, tone: Tone) -> Line<'static> {
    if width == 0 {
        return Line::default();
    }
    let frac = if frac.is_nan() {
        0.0
    } else {
        frac.clamp(0.0, 1.0)
    };
    let n = (frac * width as f64).round() as usize;
    Line::from(vec![
        Span::styled("█".repeat(n), tone_style(th, tone)),
        Span::styled("░".repeat(width - n), th.muted),
    ])
}

pub fn dots(th: &Theme, days: &[bool]) -> Line<'static> {
    Line::from(
        days.iter()
            .map(|&on| {
                if on {
                    Span::styled("●", th.pass)
                } else {
                    Span::styled("○", th.muted)
                }
            })
            .collect::<Vec<_>>(),
    )
}

pub fn tab_bar(th: &Theme, tabs: &[&str], active: usize, width: usize) -> Lines {
    let mut spans = vec![
        Span::raw(" "),
        Span::styled("myleet", th.title),
        Span::raw("   "),
    ];
    for (i, t) in tabs.iter().enumerate() {
        if i > 0 {
            spans.push(Span::styled("·", th.border));
        }
        let style = if i == active {
            solid(th.accent)
        } else {
            th.muted
        };
        spans.push(Span::styled(format!(" {t} "), style));
    }
    vec![
        pad(Line::from(spans), width),
        Line::from(Span::styled("─".repeat(width), th.border)),
    ]
}

/// KeyBar drops trailing keys until the keys and the toast fit.
pub fn key_bar(th: &Theme, keys: &[Key], width: usize, right: Line<'static>) -> Line<'static> {
    key_bar_lines(th, keys, width, right, 1).remove(0)
}

/// Like `key_bar`, but wraps onto up to max_lines rows before dropping keys.
pub fn key_bar_lines(
    th: &Theme,
    keys: &[Key],
    width: usize,
    right: Line<'static>,
    max_lines: usize,
) -> Lines {
    let sep = || Span::styled(" · ", th.border);
    let more = vec![
        Span::styled("?", th.accent),
        Span::raw(" "),
        Span::styled("more", th.muted),
    ];
    let right_w = right.width();
    let max_lines = max_lines.max(1);
    let mut n = keys.len();
    loop {
        let mut parts: Vec<Vec<Span<'static>>> = keys[..n]
            .iter()
            .map(|k| {
                vec![
                    Span::styled(k.key.clone(), th.accent),
                    Span::raw(" "),
                    Span::styled(k.label.clone(), th.muted),
                ]
            })
            .collect();
        parts.push(more.clone());
        let mut lines: Vec<Line<'static>> = Vec::new();
        for p in parts {
            let pw: usize = p.iter().map(Span::width).sum();
            match lines.last_mut() {
                Some(last) if last.width() + 3 + pw <= width => {
                    last.spans.push(sep());
                    last.spans.extend(p);
                }
                _ => {
                    let mut l = Line::from(" ");
                    l.spans.extend(p);
                    lines.push(l);
                }
            }
        }
        let last_w = lines.last().map_or(0, Line::width);
        let fits = lines.len() <= max_lines && last_w + right_w < width;
        if fits || n == 0 {
            lines.truncate(max_lines);
            let last = lines.len() - 1;
            if right_w > 0 {
                let gap = width.saturating_sub(lines[last].width() + right_w).max(1);
                lines[last].spans.push(Span::raw(" ".repeat(gap)));
                lines[last].spans.extend(right.spans.clone());
            }
            return lines.into_iter().map(|l| pad(l, width)).collect();
        }
        n -= 1;
    }
}

pub fn modal(
    th: &Theme,
    title: &str,
    body: impl Into<Text<'static>>,
    width: usize,
    height: usize,
) -> Lines {
    modal_tone(th, title, body, width, height, Tone::Muted)
}

/// Modal with a tinted border/title (e.g. `Tone::Fail` for destructive confirms).
pub fn modal_tone(
    th: &Theme,
    title: &str,
    body: impl Into<Text<'static>>,
    width: usize,
    height: usize,
    tone: Tone,
) -> Lines {
    let body = text_lines(body);
    let widest = body
        .iter()
        .map(|l| l.width() + 4)
        .fold(str_width(title) + 6, usize::max);
    let card_w = widest.max(30).min(width.saturating_sub(4).max(4));
    // Wrap before counting, so wrapped lines cannot push the border off-screen.
    let mut lines: Lines = body
        .into_iter()
        .flat_map(|l| wrap_lines(l, card_w.saturating_sub(4).max(1)))
        .collect();
    let room = height.saturating_sub(2).max(1);
    if lines.len() > room {
        lines.truncate(room - 1);
        lines.push(Line::from("…"));
    }
    let boxed = if tone == Tone::Muted {
        card(th, title, lines, card_w, true)
    } else {
        card_tone(th, title, lines, card_w, tone)
    };
    place(boxed, width.max(1), height.max(1))
}

/// Centers a block of lines in a width x height area, like lipgloss.Place.
pub fn place(block: Lines, width: usize, height: usize) -> Lines {
    let block_w = block.iter().map(Line::width).max().unwrap_or(0);
    let left = " ".repeat(width.saturating_sub(block_w).div_ceil(2));
    let top = height.saturating_sub(block.len()).div_ceil(2);
    let mut out: Lines = vec![Line::default(); top];
    for l in block {
        let mut spans = vec![Span::raw(left.clone())];
        spans.extend(l.spans);
        out.push(Line::from(spans));
    }
    out.resize(height.max(out.len()), Line::default());
    out.into_iter().map(|l| pad(l, width)).collect()
}

/// Places blocks side by side, each padded to its widest line.
pub fn columns(gap: usize, cols: Vec<Lines>) -> Lines {
    let widths: Vec<usize> = cols
        .iter()
        .map(|c| c.iter().map(Line::width).max().unwrap_or(0))
        .collect();
    let rows = cols.iter().map(Vec::len).max().unwrap_or(0);
    (0..rows)
        .map(|r| {
            let mut spans = Vec::new();
            for (i, col) in cols.iter().enumerate() {
                if i > 0 {
                    spans.push(Span::raw(" ".repeat(gap)));
                }
                let cell = col.get(r).cloned().unwrap_or_default();
                spans.extend(pad(cell, widths[i]).spans);
            }
            Line::from(spans)
        })
        .collect()
}

/// The terminal width at which two-panel Today layouts sit side by side.
pub const WIDE_MIN: usize = 100;

/// Returns left/right column widths for a two-panel row inside total_width,
/// or None when the terminal is too narrow (the caller stacks full-width panels).
pub fn split_row(total_width: usize, gap: usize) -> Option<(usize, usize)> {
    if total_width < WIDE_MIN || total_width <= gap {
        return None;
    }
    let inner = total_width - gap;
    let left = (inner * 3 / 5).max(24);
    let right = inner.checked_sub(left)?;
    (right >= 20).then_some((left, right))
}

/// Places left and right side by side with gap, or stacks them when narrow.
/// left and right must already be rendered at their split widths (or total_width when stacking).
pub fn join_panels(left: Lines, right: Lines, gap: usize, total_width: usize) -> Lines {
    if split_row(total_width, gap).is_some() {
        return columns(gap, vec![left, right]);
    }
    if right.is_empty() {
        return left;
    }
    if left.is_empty() {
        return right;
    }
    let mut out = left;
    out.push(Line::default());
    out.extend(right);
    out
}

const SPINNER: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

pub fn spinner_frame(i: i64) -> &'static str {
    SPINNER[i.rem_euclid(SPINNER.len() as i64) as usize]
}

/// Plain text of a line, for tests and width-free comparisons.
pub fn plain(line: &Line<'_>) -> String {
    line.spans.iter().map(|s| s.content.as_ref()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tui::theme::assert_palette;

    fn th() -> Theme {
        Theme::new()
    }

    fn text(lines: &[Line<'_>]) -> String {
        lines.iter().map(plain).collect::<Vec<_>>().join("\n")
    }

    #[test]
    fn card_width_exact() {
        for w in [10, 40, 79] {
            let out = card(&th(), "title", "hello\nworld", w, false);
            for (i, l) in out.iter().enumerate() {
                assert_eq!(l.width(), w, "width {w}: line {i}: {:?}", plain(l));
            }
            let first = plain(&out[0]);
            assert!(
                first.starts_with("╭─ ti") && first.ends_with('╮'),
                "top border {first:?}"
            );
        }
    }

    #[test]
    fn card_wraps_long_lines() {
        let out = card(
            &th(),
            "t",
            "We'll walk through a few easy problems so we can see which topics feel solid and which ones need more practice.",
            40,
            false,
        );
        let s = text(&out);
        assert!(
            !s.contains('…'),
            "card body should wrap, not truncate:\n{s}"
        );
        assert!(s.contains("practice"), "wrapped card lost text:\n{s}");
        for l in &out {
            assert_eq!(l.width(), 40, "{:?}", plain(l));
        }
    }

    #[test]
    fn wrap_lines_breaks_on_words() {
        let got = wrap_lines(Line::from("skip any topic without judgment here"), 12);
        assert!(got.len() >= 2, "{got:?}");
        for l in &got {
            assert!(l.width() <= 12, "{:?}", plain(l));
        }
        assert_eq!(plain(&got[0]), "skip any");
    }

    #[test]
    fn wrap_keeps_styles_and_wide_chars() {
        let th = th();
        let line = Line::from(vec![
            Span::styled("bold words", th.title),
            Span::raw(" 漢字漢字 tail"),
        ]);
        let got = wrap_lines(line, 8);
        assert_eq!(got[0].spans[0].style, th.title);
        for l in &got {
            assert!(l.width() <= 8, "{:?}", plain(l));
        }
        assert_eq!(pad(Line::from("漢字"), 6).width(), 6);
        assert_eq!(plain(&truncate(Line::from("漢字漢字"), 5)), "漢字…");
    }

    #[test]
    fn card_tiny_width() {
        let _ = card(&th(), "long title here", "body", 4, true);
        let _ = card(&th(), "", "", 0, false);
    }

    #[test]
    fn bar_fill() {
        let th = th();
        assert_eq!(plain(&bar(&th, 0.5, 10, Tone::Accent)), "█████░░░░░");
        assert_eq!(plain(&bar(&th, 2.0, 4, Tone::Pass)), "████");
        assert_eq!(plain(&bar(&th, -1.0, 4, Tone::Pass)), "░░░░");
    }

    #[test]
    fn key_bar_drops_to_fit() {
        let keys = [
            Key::new("enter", "start"),
            Key::new("j/k", "move"),
            Key::new("/", "search"),
            Key::new("m", "map"),
            Key::new("i", "interview"),
            Key::new("s", "stats"),
        ];
        let out = key_bar(&th(), &keys, 40, Line::from("saved"));
        let s = plain(&out);
        assert_eq!(out.width(), 40);
        assert!(s.contains("enter start") && s.contains("? more"), "{s:?}");
        assert!(s.trim_end().ends_with("saved"), "{s:?}");
    }

    #[test]
    fn key_bar_lines_wraps_before_dropping() {
        let keys = [
            Key::new("e", "edit"),
            Key::new("space", "rerun"),
            Key::new("tab", "window"),
            Key::new("z", "zoom"),
            Key::new("o", "leetcode"),
            Key::new("esc", "back"),
        ];
        let out = key_bar_lines(&th(), &keys, 50, Line::from("saved"), 2);
        assert_eq!(out.len(), 2, "{:?}", text(&out));
        let s = text(&out);
        for want in ["e edit", "esc back", "? more", "saved"] {
            assert!(s.contains(want), "lost {want:?}:\n{s}");
        }
        for l in &out {
            assert_eq!(l.width(), 50, "{:?}", plain(l));
        }
        assert_eq!(
            key_bar_lines(&th(), &keys[..2], 40, Line::default(), 2).len(),
            1
        );
    }

    #[test]
    fn tab_bar_active() {
        let tabs = ["today", "map", "interview", "playlists", "stats"];
        let out = tab_bar(&th(), &tabs, 1, 70);
        assert_eq!(out.len(), 2);
        let first = plain(&out[0]);
        for want in ["myleet"].iter().chain(tabs.iter()) {
            assert!(first.contains(want), "missing {want:?} in {first:?}");
        }
        assert!(plain(&out[1]).chars().all(|c| c == '─') && out[1].width() == 70);
        let active = out[0].spans.iter().find(|s| s.content == " map ").unwrap();
        assert!(active.style.add_modifier.contains(Modifier::REVERSED));
    }

    #[test]
    fn modal_centered() {
        let out = modal(&th(), "keys", "a\nb", 80, 24);
        assert_eq!(out.len(), 24);
        let row = out
            .iter()
            .map(plain)
            .find(|l| l.contains('╭'))
            .expect("border");
        let col = row.chars().position(|c| c == '╭').unwrap();
        assert!(col > 10, "modal not centered: border at column {col}");
        assert!(out.iter().all(|l| l.width() == 80));
    }

    #[test]
    fn modal_too_tall_ends_in_ellipsis() {
        let body = (0..30)
            .map(|i| format!("line {i}"))
            .collect::<Vec<_>>()
            .join("\n");
        let out = modal(&th(), "keys", body, 60, 10);
        assert_eq!(out.len(), 10);
        let s = text(&out);
        assert!(s.contains('…') && s.contains('╰'), "{s}");
    }

    #[test]
    fn columns_join() {
        let a = vec![Line::from("aaaaa"); 3];
        let b = vec![Line::from("bbbbbbb"); 3];
        for l in columns(2, vec![a, b]) {
            assert_eq!(l.width(), 14);
        }
    }

    #[test]
    fn split_row_and_join_panels() {
        assert_eq!(split_row(80, 2), None);
        let (l, r) = split_row(120, 2).unwrap();
        assert_eq!(l + r, 118);
        let stacked = join_panels(vec![Line::from("L")], vec![Line::from("R")], 2, 80);
        assert_eq!(text(&stacked), "L\n\nR");
        let side = join_panels(vec![Line::from("L")], vec![Line::from("R")], 2, 120);
        assert_eq!(side.len(), 1);
        assert!(plain(&side[0]).contains('L') && plain(&side[0]).contains('R'));
    }

    #[test]
    fn dots_render() {
        assert_eq!(plain(&dots(&th(), &[true, true, false])), "●●○");
    }

    #[test]
    fn spinner_frames() {
        assert_ne!(spinner_frame(0), spinner_frame(1));
        assert_eq!(spinner_frame(0), spinner_frame(10));
        assert_eq!(spinner_frame(-1), spinner_frame(9));
    }

    #[test]
    fn kit_ansi_only() {
        let th = th();
        let mut lines = vec![Line::from(vec![
            badge(&th, "REVIEW", BadgeKind::Review),
            badge(&th, "med", BadgeKind::Medium),
            chip(&th, "x", Tone::Fail),
            block(&th, "y", 5, Tone::Pass),
        ])];
        lines.push(bar(&th, 0.3, 10, Tone::Fail));
        lines.push(dots(&th, &[true, false]));
        lines.extend(card(&th, "x", "y", 20, true));
        lines.extend(card_tone(&th, "x", "y", 20, Tone::Due));
        lines.extend(tab_bar(&th, &["a", "b"], 0, 20));
        lines.extend(key_bar_lines(
            &th,
            &[Key::new("a", "b")],
            20,
            Line::from("t"),
            2,
        ));
        lines.extend(modal_tone(&th, "m", "body", 40, 10, Tone::Fail));
        assert_palette(&lines);
    }

    #[test]
    fn block_fills_width_and_centers_text() {
        let out = block(&th(), "⏱ 01:00", 20, Tone::Due);
        assert_eq!(out.width(), 20);
        let lead = (20 - str_width("⏱ 01:00")) / 2;
        assert!(out.content.starts_with(&" ".repeat(lead)) && out.content.contains("⏱ 01:00"));
        assert!(out.style.add_modifier.contains(Modifier::REVERSED));
    }

    #[test]
    fn block_truncates_long_text() {
        assert_eq!(
            block(&th(), "a very long block label", 10, Tone::Fail).width(),
            10
        );
    }

    #[test]
    fn chip_pads_text() {
        assert_eq!(chip(&th(), "Two Sum", Tone::Accent).content, " Two Sum ");
    }
}
