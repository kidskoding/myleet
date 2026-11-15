# Spec: rust-tui-shell

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 7)

______________________________________________________________________

## Problem

Every Rust screen (Today, Focus, Map, Playlists, Search, Timed, Stats) needs the same
frame, theme and widgets the Go trainer draws with lipgloss. Without one shared
foundation each screen port would re-invent cards, key bars and tab switching, and the
screens would drift from each other and from the Go build.

## Goal

A ratatui + crossterm shell that `myleet-rs` launches with no arguments: tab bar, screen
stack, key bar, toast, status line and help modal behaving like `internal/tui/app.go`, a
widget kit matching `internal/tui/ui`, the ANSI-16 theme, and a markdown renderer for
notes, with placeholder screens on every tab until the real screens are ported.

## User Stories

- As a learner, I want `myleet-rs` to open the trainer frame with the same tabs and keys
  as the Go build, so muscle memory carries over.
- As a learner, I want the Rust UI to follow my terminal's colors like the Go build does,
  so it reads well on light and dark themes.
- As the next porting agent, I want a `Screen` trait and widgets that compose like the Go
  strings do, so a screen port is mostly translation.

## Requirements

### Must-have

- `theme`: Accent, Pass, Fail, Due, Muted, Title, Selected, Border; named ANSI colors 0-15
  only, never a background (a test enforces it).
- `ui`: Tone, BadgeKind, Key, card, card_tone, chip, block, badge, bar, dots, tab_bar,
  key_bar, key_bar_lines, modal, modal_tone, columns, split_row, join_panels, pad, truncate,
  wrap_lines, spinner_frame; display-width aware; ported `ui_test.go`.
- Shell: screen stack with push, pop, jump, tab switch; `[`/`]` from anywhere unless the
  screen owns the key; `1-5`, `tab`, `shift+tab` on root screens; `esc` on a root tab
  returns to today and never quits; `?` help modal; `q` and `ctrl+c` quit; `/` and
  `ctrl+k` push search (a hook; search is not ported); two key-bar rows when height ≥ 16;
  toast that expires after 2s; sticky status line; window title `myleet · <title>`; mouse
  forwarded with the tab bar offset when a screen wants it.
- Markdown: headings (h1 reverse-video accent, h2 `▍` accent, h3 accent), bold, italic,
  strikethrough, inline code and indented code blocks in yellow, quotes, lists, rules,
  links (web links keep the URL, links to repo files show only text), word wrap.
- `myleet-rs` with no arguments runs the TUI; the terminal is restored on exit and panic.

### Nice-to-have

- Placeholder today card shows the real module count when a curriculum is found.

### Out of scope

- The real screens (features 8-12) and the search screen.
- Progress, runner, prompts, watch and open-URL hooks on `Shared` (added with the screens
  that use them). The shell never reads or writes progress files.

## Data Model

None. No files are read except the catalog for the placeholder count.

## API Changes

None. CLI: `myleet-rs` with no arguments now opens the TUI instead of exiting 2.

## UI Changes

Ports the Go frame: row 0 tab bar ` myleet    today · map · timed · playlists · stats`, a
rule, the screen body, an optional status line in red, then one or two key-bar rows with
the toast at the right. Active tab, chips, badges and blocks are reverse video.

## Edge Cases

1. **Narrow terminal**: key bar drops trailing keys but keeps `? more`; cards keep exact
   width down to 4 columns; long lines are truncated with `…` by the frame.
2. **Tiny height**: body height never goes negative; a modal taller than the screen ends
   in `…` instead of pushing its border off.
3. **Wide characters** (CJK, emoji) count as two columns in padding, wrapping and
   truncation.
4. **Panic in a screen**: the terminal leaves raw mode and the alternate screen first.
5. **A toast replaced before it expires**: the old timer does not clear the new toast.

## Testing Criteria

### Happy path

- Ported `ui_test.go`, `theme_test.go`, `markdown_test.go` cases.
- `frame_test.go` behaviors on `TestBackend` at 80x24 and 120x32: tab bar and key bar,
  number keys, owned digits, esc on root, toast expiry, status plus toast, help modal,
  brackets from a pushed screen, owned brackets, full-width cards.

### Edge cases

- Kit and markdown buffers contain only named ANSI foregrounds and no backgrounds.
- Card width exact at 10, 40, 79; tiny card does not panic; stale toast id ignored.

## Dependencies

- Feature 1 (crate). Feature 2 catalog for the placeholder count.
- Crates: `ratatui`, `crossterm`, `unicode-width`, `pulldown-cmark`.
