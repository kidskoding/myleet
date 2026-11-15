//! Renders notes and problem statements to styled lines. Only the 16 terminal
//! colors are used so notes follow the terminal theme.

use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};

use super::theme::Theme;
use super::ui::{Lines, plain, str_width, wrap_lines};

struct Renderer {
    th: Theme,
    width: usize,
    out: Lines,
    spans: Vec<Span<'static>>,
    styles: Vec<Style>,
    heading: Option<HeadingLevel>,
    quote: usize,
    /// Next number per open list; None for bullet lists.
    lists: Vec<Option<u64>>,
    /// Marker width of each open list item, for continuation indent.
    items: Vec<usize>,
    bullet: Option<String>,
    code: Option<Vec<String>>,
    /// Some(url) inside a web link; None inside a link to a repo file.
    links: Vec<Option<String>>,
    table: Option<Vec<Vec<Vec<Span<'static>>>>>,
}

/// A link to another repo file (no scheme, no space) means nothing in a terminal.
fn is_file_link(url: &str) -> bool {
    !url.contains(':') && !url.contains(char::is_whitespace)
}

impl Renderer {
    fn style(&self) -> Style {
        self.styles.last().copied().unwrap_or_default()
    }

    fn push_style(&mut self, f: impl FnOnce(Style) -> Style) {
        let s = f(self.style());
        self.styles.push(s);
    }

    fn text(&mut self, s: &str) {
        let st = self.style();
        self.spans.push(Span::styled(s.to_string(), st));
    }

    fn blank(&mut self) {
        if self.out.last().is_some_and(|l| l.width() > 0) {
            self.out.push(Line::default());
        }
    }

    /// Prefixes for the first and later lines of the current block.
    fn prefixes(&mut self) -> (Vec<Span<'static>>, Vec<Span<'static>>) {
        let mut base = Vec::new();
        if self.quote > 0 {
            base.push(Span::styled("│ ".repeat(self.quote), self.th.border));
        }
        let indent: usize = self.items.iter().sum();
        let mut rest = base.clone();
        rest.push(Span::raw(" ".repeat(indent)));
        let first = match self.bullet.take() {
            Some(b) => {
                let mut f = base;
                f.push(Span::raw(" ".repeat(indent - str_width(&b))));
                f.push(Span::styled(b, self.th.accent));
                f
            }
            None => rest.clone(),
        };
        (first, rest)
    }

    fn flush(&mut self) {
        if self.spans.is_empty() {
            return;
        }
        let spans = std::mem::take(&mut self.spans);
        let line = match self.heading {
            Some(level) => self.heading_line(level, spans),
            None => Line::from(spans),
        };
        let (first, rest) = self.prefixes();
        let room = self
            .width
            .saturating_sub(Line::from(rest.clone()).width())
            .max(1);
        for (i, part) in wrap_lines(line, room).into_iter().enumerate() {
            let mut spans = if i == 0 { first.clone() } else { rest.clone() };
            spans.extend(part.spans);
            self.out.push(Line::from(spans));
        }
    }

    fn heading_line(&self, level: HeadingLevel, spans: Vec<Span<'static>>) -> Line<'static> {
        let th = &self.th;
        let bold = Style::new().add_modifier(Modifier::BOLD);
        let accent = th.accent.add_modifier(Modifier::BOLD);
        let (base, prefix, suffix) = match level {
            HeadingLevel::H1 => (accent.add_modifier(Modifier::REVERSED), " ", " "),
            HeadingLevel::H2 => (accent, "▍ ", ""),
            HeadingLevel::H3 => (accent, "", ""),
            HeadingLevel::H6 => (th.muted.add_modifier(Modifier::BOLD), "", ""),
            _ => (bold, "", ""),
        };
        let mut out = vec![Span::styled(prefix, base)];
        out.extend(spans.into_iter().map(|s| {
            let st = base.patch(s.style);
            Span::styled(s.content, st)
        }));
        out.push(Span::styled(suffix, base));
        Line::from(out)
    }

    fn code_block(&mut self, lines: Vec<String>) {
        let (_, rest) = self.prefixes();
        for l in lines {
            let mut spans = rest.clone();
            spans.push(Span::raw("  "));
            spans.push(Span::styled(l, self.th.due));
            self.out.push(Line::from(spans));
        }
    }

    fn table_lines(&mut self, rows: Vec<Vec<Vec<Span<'static>>>>) {
        let cols = rows.iter().map(Vec::len).max().unwrap_or(0);
        let mut widths = vec![0; cols];
        for row in &rows {
            for (i, cell) in row.iter().enumerate() {
                widths[i] = widths[i].max(cell.iter().map(Span::width).sum());
            }
        }
        let sep = Span::styled(" │ ", self.th.border);
        for (r, row) in rows.into_iter().enumerate() {
            let mut spans = Vec::new();
            for (i, cell) in row.into_iter().enumerate() {
                if i > 0 {
                    spans.push(sep.clone());
                }
                let w: usize = cell.iter().map(Span::width).sum();
                let cell = cell.into_iter().map(|s| {
                    if r == 0 {
                        s.patch_style(Modifier::BOLD)
                    } else {
                        s
                    }
                });
                spans.extend(cell);
                spans.push(Span::raw(" ".repeat(widths[i] - w)));
            }
            self.out.push(Line::from(spans));
            if r == 0 {
                let rule = widths
                    .iter()
                    .map(|w| "─".repeat(*w))
                    .collect::<Vec<_>>()
                    .join("─┼─");
                self.out
                    .push(Line::from(Span::styled(rule, self.th.border)));
            }
        }
    }

    fn event(&mut self, ev: Event<'_>) {
        if let Some(code) = self.code.as_mut() {
            match ev {
                Event::Text(t) => code.extend(t.lines().map(str::to_string)),
                Event::End(TagEnd::CodeBlock) => {
                    let lines = self.code.take().unwrap_or_default();
                    self.code_block(lines);
                    self.blank();
                }
                _ => {}
            }
            return;
        }
        match ev {
            Event::Start(tag) => self.start(tag),
            Event::End(tag) => self.end(tag),
            Event::Text(t) => self.text(&t),
            Event::Code(t) => {
                let st = self.style().patch(self.th.due);
                self.spans.push(Span::styled(t.to_string(), st));
            }
            Event::Html(t) | Event::InlineHtml(t) => self.text(t.trim_end_matches('\n')),
            Event::SoftBreak => self.text(" "),
            Event::HardBreak => self.flush(),
            Event::Rule => {
                self.flush();
                self.out
                    .push(Line::from(Span::styled("────────", self.th.muted)));
                self.blank();
            }
            Event::TaskListMarker(done) => self.text(if done { "[✓] " } else { "[ ] " }),
            _ => {}
        }
    }

    fn start(&mut self, tag: Tag<'_>) {
        match tag {
            Tag::Paragraph => self.flush(),
            Tag::Heading { level, .. } => {
                self.flush();
                self.heading = Some(level);
            }
            Tag::BlockQuote(_) => {
                self.flush();
                self.quote += 1;
                self.push_style(|s| s.add_modifier(Modifier::ITALIC));
            }
            Tag::CodeBlock(_) => {
                self.flush();
                self.code = Some(Vec::new());
            }
            Tag::List(start) => {
                self.flush();
                self.lists.push(start);
            }
            Tag::Item => {
                self.flush();
                let marker = match self.lists.last_mut() {
                    Some(Some(n)) => {
                        *n += 1;
                        format!("{}. ", *n - 1)
                    }
                    _ => "• ".to_string(),
                };
                self.items.push(str_width(&marker));
                self.bullet = Some(marker);
            }
            Tag::Emphasis => self.push_style(|s| s.add_modifier(Modifier::ITALIC)),
            Tag::Strong => self.push_style(|s| s.add_modifier(Modifier::BOLD)),
            Tag::Strikethrough => self.push_style(|s| s.add_modifier(Modifier::CROSSED_OUT)),
            Tag::Link { dest_url, .. } => {
                if is_file_link(&dest_url) {
                    self.links.push(None);
                    self.push_style(|s| s);
                } else {
                    self.links.push(Some(dest_url.to_string()));
                    let accent = self.th.accent;
                    self.push_style(|s| s.patch(accent));
                }
            }
            Tag::Image { .. } => {
                self.text("Image: ");
                self.push_style(|s| s);
            }
            Tag::Table(_) => {
                self.flush();
                self.table = Some(Vec::new());
            }
            Tag::TableRow | Tag::TableHead => {
                if let Some(t) = self.table.as_mut() {
                    t.push(Vec::new());
                }
            }
            Tag::TableCell => self.spans.clear(),
            _ => {}
        }
    }

    fn end(&mut self, tag: TagEnd) {
        match tag {
            TagEnd::Paragraph => {
                self.flush();
                // Tight list items have no paragraphs; loose ones keep their gaps.
                self.blank();
            }
            TagEnd::Heading(_) => {
                self.flush();
                self.heading = None;
                self.blank();
            }
            TagEnd::BlockQuote(_) => {
                self.flush();
                self.quote -= 1;
                self.styles.pop();
                self.blank();
            }
            TagEnd::List(_) => {
                self.flush();
                self.lists.pop();
                if self.lists.is_empty() {
                    self.blank();
                }
            }
            TagEnd::Item => {
                self.flush();
                self.items.pop();
                self.bullet = None;
            }
            TagEnd::Emphasis | TagEnd::Strong | TagEnd::Strikethrough | TagEnd::Image => {
                self.styles.pop();
            }
            TagEnd::Link => {
                self.styles.pop();
                if let Some(Some(url)) = self.links.pop() {
                    let st = self.th.muted.add_modifier(Modifier::UNDERLINED);
                    self.spans.push(Span::raw(" "));
                    self.spans.push(Span::styled(url, st));
                }
            }
            TagEnd::TableCell => {
                let cell = std::mem::take(&mut self.spans);
                if let Some(row) = self.table.as_mut().and_then(|t| t.last_mut()) {
                    row.push(cell);
                }
            }
            TagEnd::Table => {
                let rows = self.table.take().unwrap_or_default();
                self.table_lines(rows);
                self.blank();
            }
            _ => {}
        }
    }
}

pub fn render_markdown(th: &Theme, md: &str, width: usize) -> Lines {
    let mut r = Renderer {
        th: *th,
        width: width.max(20),
        out: Vec::new(),
        spans: Vec::new(),
        styles: Vec::new(),
        heading: None,
        quote: 0,
        lists: Vec::new(),
        items: Vec::new(),
        bullet: None,
        code: None,
        links: Vec::new(),
        table: None,
    };
    let opts = Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TABLES | Options::ENABLE_TASKLISTS;
    for ev in Parser::new_ext(md, opts) {
        r.event(ev);
    }
    r.flush();
    let mut out = r.out;
    while out.last().is_some_and(|l| plain(l).trim().is_empty()) {
        out.pop();
    }
    let lead = out
        .iter()
        .take_while(|l| plain(l).trim().is_empty())
        .count();
    out.drain(..lead);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tui::theme::assert_palette;
    use ratatui::style::Color;

    const SAMPLE: &str = "# How to Prepare\n\nA **pattern** is *reusable*; call `seen.add(x)`.\n\n## Use the Book\n\n### Detail\n\n```text\nlearn -> solve -> review\n```\n\n> quoted\n\n- one\n- two\n\n---\n";

    fn render(md: &str, w: usize) -> Lines {
        render_markdown(&Theme::new(), md, w)
    }

    fn joined(lines: &[Line<'_>]) -> String {
        lines.iter().map(plain).collect::<Vec<_>>().join("\n")
    }

    fn line_with<'a>(lines: &'a [Line<'static>], text: &str) -> &'a Line<'static> {
        lines
            .iter()
            .find(|l| plain(l).contains(text))
            .unwrap_or_else(|| panic!("no line with {text:?}"))
    }

    #[test]
    fn hides_syntax() {
        let out = joined(&render(SAMPLE, 80));
        for raw in ["# ", "**", "`", "*reusable*", "---"] {
            assert!(!out.contains(raw), "should not show {raw:?}:\n{out}");
        }
        for text in [
            "How to Prepare",
            "pattern",
            "seen.add(x)",
            "Use the Book",
            "learn -> solve -> review",
            "quoted",
            "one",
        ] {
            assert!(out.contains(text), "lost {text:?}:\n{out}");
        }
    }

    #[test]
    fn styles_headings_and_code() {
        let out = render(SAMPLE, 80);
        let has =
            |l: &Line<'_>, m: Modifier| l.spans.iter().any(|s| s.style.add_modifier.contains(m));
        let fg = |l: &Line<'_>, c: Color| l.spans.iter().any(|s| s.style.fg == Some(c));
        let h1 = line_with(&out, "How to Prepare");
        assert!(
            has(h1, Modifier::REVERSED),
            "h1 should be reverse video: {h1:?}"
        );
        let h2 = line_with(&out, "Use the Book");
        assert!(
            has(h2, Modifier::BOLD) && fg(h2, Color::Blue),
            "h2 bold accent: {h2:?}"
        );
        let code = line_with(&out, "learn -> solve");
        assert!(
            plain(code).starts_with("  ") && fg(code, Color::Yellow),
            "code blocks indented and colored: {code:?}"
        );
        let inline = line_with(&out, "seen.add");
        let span = inline
            .spans
            .iter()
            .find(|s| s.content == "seen.add(x)")
            .unwrap();
        assert_eq!(span.style.fg, Some(Color::Yellow));
    }

    #[test]
    fn uses_terminal_palette() {
        assert_palette(&render(SAMPLE, 80));
    }

    #[test]
    fn relative_links_show_only_text() {
        let out = joined(&render(
            "See [common costs](../../guide/04_costs.md#lists) and [LeetCode](https://leetcode.com/problems/two-sum/).",
            120,
        ));
        assert!(
            out.contains("See common costs and LeetCode") && !out.contains("04_costs"),
            "{out:?}"
        );
        assert!(
            out.contains("https://leetcode.com/problems/two-sum/"),
            "{out:?}"
        );
    }

    #[test]
    fn wraps_and_indents_lists() {
        let md = "- a list item long enough that it has to wrap onto the next line\n  - nested\n\n1. first\n2. second\n";
        let out = render(md, 30);
        for l in &out {
            assert!(l.width() <= 30, "{:?}", plain(l));
        }
        let s = joined(&out);
        assert!(s.starts_with("• a list item"), "{s}");
        assert!(s.contains("\n  ") && s.contains("  • nested"), "{s}");
        assert!(s.contains("1. first") && s.contains("2. second"), "{s}");
        assert!(!s.starts_with('\n') && !s.ends_with('\n'));
    }

    #[test]
    fn tables_and_tasks() {
        let s = joined(&render(
            "| a | bb |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n",
            80,
        ));
        assert!(
            s.contains("a │ bb") && s.contains("─┼─") && s.contains("1 │ 2"),
            "{s}"
        );
        assert!(s.contains("[✓] done") && s.contains("[ ] todo"), "{s}");
    }
}
