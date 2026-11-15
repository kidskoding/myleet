//! The theme uses only the terminal's 16-color palette and never sets a
//! background, so the user's terminal theme decides every color.

use ratatui::style::{Color, Modifier, Style};

pub const RED: Color = Color::Red;
pub const GREEN: Color = Color::Green;
pub const YELLOW: Color = Color::Yellow;
pub const BLUE: Color = Color::Blue;
// ratatui's DarkGray is ANSI 8 (bright black), not a 256-color gray.
pub const BRIGHT_BLACK: Color = Color::DarkGray;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Theme {
    pub accent: Style,
    pub pass: Style,
    pub fail: Style,
    pub due: Style,
    pub muted: Style,
    pub title: Style,
    pub selected: Style,
    pub border: Style,
}

impl Default for Theme {
    fn default() -> Self {
        Self::new()
    }
}

impl Theme {
    pub fn new() -> Theme {
        let base = Style::new();
        Theme {
            accent: base.fg(BLUE),
            pass: base.fg(GREEN),
            fail: base.fg(RED),
            due: base.fg(YELLOW),
            muted: base.fg(BRIGHT_BLACK),
            title: base.add_modifier(Modifier::BOLD),
            selected: base.fg(BLUE).add_modifier(Modifier::BOLD),
            border: base.fg(BRIGHT_BLACK),
        }
    }

    pub fn all(&self) -> [Style; 8] {
        [
            self.accent,
            self.pass,
            self.fail,
            self.due,
            self.muted,
            self.title,
            self.selected,
            self.border,
        ]
    }
}

/// Named colors are the ones crossterm writes as SGR 30-37/90-97; `Indexed` and
/// `Rgb` become 38;5 / 38;2 sequences outside the user's palette.
#[cfg(test)]
pub(crate) fn is_ansi16(c: Color) -> bool {
    !matches!(c, Color::Indexed(_) | Color::Rgb(..))
}

#[cfg(test)]
pub(crate) fn assert_palette(lines: &[ratatui::text::Line<'_>]) {
    for (i, line) in lines.iter().enumerate() {
        for span in std::iter::once(&line.style).chain(line.spans.iter().map(|s| &s.style)) {
            assert!(span.bg.is_none(), "line {i} sets a background: {line:?}");
            if let Some(fg) = span.fg {
                assert!(is_ansi16(fg), "line {i} uses {fg:?}: {line:?}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theme_ansi_only() {
        for (i, s) in Theme::new().all().iter().enumerate() {
            if let Some(fg) = s.fg {
                assert!(
                    is_ansi16(fg),
                    "style {i} foreground {fg:?} outside ANSI 0-15"
                );
            }
            assert!(s.bg.is_none(), "style {i} sets a background {:?}", s.bg);
        }
    }

    #[test]
    fn semantic_colors() {
        let th = Theme::new();
        assert_eq!(th.accent.fg, Some(Color::Blue));
        assert_eq!(th.pass.fg, Some(Color::Green));
        assert_eq!(th.fail.fg, Some(Color::Red));
        assert_eq!(th.due.fg, Some(Color::Yellow));
        assert_eq!(th.muted.fg, Some(Color::DarkGray));
    }
}
