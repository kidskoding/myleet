# Plan: rust-tui-shell

**Spec**: .planning/specs/rust-tui-shell.md
**Epic**: rust-rewrite (feature 7)
**Created**: 2026-11-14
**Status**: draft

______________________________________________________________________

## Architecture

| Component       | Type   | Purpose                                                   |
| --------------- | ------ | --------------------------------------------------------- |
| `tui::theme`    | module | ANSI-16 `Style`s                                          |
| `tui::ui`       | module | widget kit returning `Vec<Line<'static>>`                 |
| `tui::app`      | module | `Screen` trait, `Msg`, `Cmd`, `Shared`, `App` update/view |
| `tui::help`     | module | help modal text                                           |
| `tui::widgets`  | module | shared screen helpers (spread, glyph, mmss, ...)          |
| `tui::markdown` | module | pulldown-cmark to styled lines                            |
| `tui::screens`  | module | `new_tab`, `new_search`, placeholder screens              |
| `tui::run`      | fn     | crossterm event loop, terminal setup and restore          |

Widgets return lines instead of rendering into a buffer, so screens compose them the way
the Go screens join strings. The frame draws the final lines with one `Paragraph`. Go's
async `tea.Cmd` becomes a `Cmd` enum the app applies at once; timed messages go through
`Shared::after`, background work through `Shared::sender`.

### New files

| File          | Location   | Purpose                    |
| ------------- | ---------- | -------------------------- |
| `mod.rs`      | `src/tui/` | module root, `run`         |
| `theme.rs`    | `src/tui/` | theme + tests              |
| `ui.rs`       | `src/tui/` | widgets + tests            |
| `app.rs`      | `src/tui/` | shell + frame tests        |
| `help.rs`     | `src/tui/` | help modal                 |
| `widgets.rs`  | `src/tui/` | screen helpers             |
| `markdown.rs` | `src/tui/` | markdown + tests           |
| `screens.rs`  | `src/tui/` | tab registry, placeholders |

### Files to change

| File             | What changes                                 | Why              |
| ---------------- | -------------------------------------------- | ---------------- |
| `Cargo.toml`     | add ratatui, crossterm, unicode-width, cmark | spec deps        |
| `src/lib.rs`     | `pub mod tui`                                |                  |
| `src/cli/mod.rs` | no arguments runs the TUI; test updated      | spec requirement |

______________________________________________________________________

## Tasks

| #   | Task                                            | Files                    | Depends on |
| --- | ----------------------------------------------- | ------------------------ | ---------- |
| 1   | Planning docs                                   | `.planning/*`            | —          |
| 2   | Theme and widget kit with ported tests          | `theme.rs`, `ui.rs`      | 1          |
| 3   | Markdown renderer with ported tests             | `markdown.rs`            | 2          |
| 4   | Shell, help, helpers, placeholders, frame tests | `app.rs`, `help.rs`, ... | 2          |
| 5   | Event loop, terminal restore, CLI wiring        | `mod.rs`, `cli/mod.rs`   | 4          |

______________________________________________________________________

## Testing plan

Ported Go unit tests for the kit, theme and markdown. Frame behaviors run the `App` on
ratatui's `TestBackend` at 80x24 and 120x32 and assert on buffer text and cell styles.
The event loop itself is checked by hand (`cargo run`).

## Gate 2

- [x] Mirrors the Go packages; screens plug in through one trait and one registry
- [x] All files listed; tasks small and ordered
- [x] Every spec edge case has a test, except the panic restore (manual)
