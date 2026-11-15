# Epic: rust-rewrite

**Created**: 2026-11-14
**Status**: planning
**Owner**: Anirudh Konidala

______________________________________________________________________

## Why

Port the myleet trainer from Go (Bubble Tea + lipgloss) to Rust + ratatui. The Rust
version is built next to the Go app on `feature/rust-rewrite`, so the Go trainer stays
usable for daily practice until the Rust one matches it screen for screen. Then the Go
code is removed.

______________________________________________________________________

## Success Criteria

- [ ] `myleet` built from Rust reads the same `progress.toml`, `events.jsonl`, attempts and
  snapshots as the Go build, and a learner can switch over with no data loss
- [ ] Every CLI command (`validate`, `check`, `doctor`, `stats`, `prompts`, `update`,
  `progress`, `version`, `open`) and every TUI screen (Today, Map, Notes, Timed,
  Playlists, Search, Stats, Focus) behave like the Go build, backed by ported tests
- [ ] CI, the release workflow, `scripts/install.sh` and `flake.nix` ship the Rust binary,
  and the Go code, `go.mod` and Go CI steps are deleted

______________________________________________________________________

## Features

| #   | Feature                                                               | Status | Spec                                             | Plan                                             | Depends On            |
| --- | --------------------------------------------------------------------- | ------ | ------------------------------------------------ | ------------------------------------------------ | --------------------- |
| 1   | Rust crate scaffold + CI                                              | built  | [spec](../specs/rust-crate-scaffold.md)          | [plan](../plans/rust-crate-scaffold.md)          | —                     |
| 2   | Catalog, config, `validate`                                           | built  | [spec](../specs/rust-catalog-config-validate.md) | [plan](../plans/rust-catalog-config-validate.md) | #1                    |
| 3   | Progress log, save state, schedule                                    | built  | [spec](../specs/rust-progress-schedule.md)       | [plan](../plans/rust-progress-schedule.md)       | #2                    |
| 4   | Session queue, placement, interview pick, checkpoint, stats           | todo   | —                                                | —                                                | #3                    |
| 5   | Workspace, runner, watch, editor, prompt fetch                        | todo   | —                                                | —                                                | #2                    |
| 6   | CLI commands                                                          | todo   | —                                                | —                                                | #3, #4, #5            |
| 7   | TUI shell, theme, widgets, markdown                                   | built  | [spec](../specs/rust-tui-shell.md)               | [plan](../plans/rust-tui-shell.md)               | #1                    |
| 8   | Today screen + placement flow                                         | todo   | —                                                | —                                                | #4, #7                |
| 9   | Focus core: timer, tests, edit/run loop                               | todo   | —                                                | —                                                | #5, #7                |
| 10  | Focus extras: pause/restart, hints, solution, diff, zoom, copy, mouse | todo   | —                                                | —                                                | #9                    |
| 11  | Map, Notes, Playlists, Search                                         | todo   | —                                                | —                                                | #7, #9                |
| 12  | Timed interview + Stats/settings                                      | todo   | —                                                | —                                                | #9                    |
| 13  | Cutover: packaging, docs, delete Go                                   | todo   | —                                                | —                                                | #6, #8, #10, #11, #12 |

Effort: #1 S · #2 M · #3 M · #4 M · #5 M · #6 M · #7 M · #8 M · #9 L · #10 M · #11 M · #12 M · #13 S.

______________________________________________________________________

## Feature Briefs

### Feature 1: Rust crate scaffold + CI

Root `Cargo.toml` next to `go.mod`, sources in `src/`, one module per Go package. The binary
is named `myleet-rs` during the port so both builds can be installed at once. A CI job runs
`cargo fmt --check`, `cargo clippy -D warnings` and `cargo test`.

### Feature 2: Catalog, config, `validate`

Load modules, techniques, problems, bank and playlists from TOML (`serde` + `toml`),
`problem-ids.lock`, and `~/.config/myleet/config.toml`. Port `myleet validate` (including
`--lock`) and check it against the Go build on the real repo, so both report the same
problems. Ports `internal/catalog` (606 lines) and `internal/config` (103).

### Feature 3: Progress log, save state, schedule

The `events.jsonl` history, the editable `progress.toml` save file, and the review ladder
(1 → 3 → 7 → 14 → 30 days). File formats must match byte for byte, enforced by fixtures
written by the Go build. Ports `progress`, `savestate`, `schedule`.

### Feature 4: Session queue, placement, interview pick, checkpoint, stats

Today's queue (due reviews, weak techniques, keep-sharp drills), the placement warm-up,
mock-interview problem picking, module checkpoints, and streak/median stats. Ports
`session`, `placement`, `interview`, `checkpoint`, `stats`.

### Feature 5: Workspace, runner, watch, editor, prompt fetch

Attempt files and snapshots, the pytest runner with JUnit parsing and timeouts (process-group
kill on unix), file watching (`notify`), `$EDITOR` launch, and the LeetCode statement fetch
with on-disk cache. Ports `workspace`, `runner`, `watch`, `editor`, `prompt`.

### Feature 6: CLI commands

`clap` subcommands matching today's CLI: `check`, `doctor`, `stats`, `prompts`, `update`,
`progress`, `version`, `open`, plus first-run curriculum bootstrap. Ports `internal/cli`
and `internal/app`.

### Feature 7: TUI shell, theme, widgets, markdown

ratatui + crossterm frame: tab bar, two-row key bar, toast, status line, help modal, screen
stack, `[`/`]` and `1-5` tab switching. Theme stays ANSI 0-15 with no backgrounds (blocks via
reverse video). Widgets: card, chip, block, badge, bar, dots, modal. Markdown rendering for
notes and statements replaces glamour. Golden tests use ratatui's `TestBackend`.

### Feature 8: Today screen + placement flow

The home queue with progress, check-ins (`c`), snooze (`n`), keep-sharp drills, and the
placement warm-up card and flow.

### Feature 9: Focus core

The problem screen: statement pane, timer sidebar, tests window, `e` edit with rerun on save,
`space` rerun, the time target ending the attempt, and recording attempt events. The largest
Go file (`focus.go`, 1130 lines), so it is split from #10.

### Feature 10: Focus extras

Pause/resume and restart with confirm, hints and key idea, reference solution, diff against
the last version, zoom, copy, scrolling, mouse focus, reset to starter, give up.

### Feature 11: Map, Notes, Playlists, Search

Module → technique → problem browser with filter, the notes reader, company playlists by
group with progress, and fuzzy search (`fuzzy-matcher` or `nucleo` for `sahilm/fuzzy`).

### Feature 12: Timed interview + Stats/settings

The mock-interview setup and round (hidden technique, hint penalties, multi-problem
switching, checkpoint save), and the stats screen with heatmap and reset-progress danger zone.

### Feature 13: Cutover

Rename `myleet-rs` to `myleet`. Switch the release workflow, `scripts/install.sh` and
`flake.nix` to the Rust build. Update README and `CLAUDE.md`. Delete `internal/`, `cmd/`,
`go.mod`, `go.sum` and the Go CI steps.

______________________________________________________________________

## Risks

- **Learner data.** Both builds share `~/.local/share/myleet/`. Until #3 passes the
  cross-format fixtures, the Rust build must use a separate `state_dir` so it cannot
  corrupt real progress.
- **Test volume.** About 5.4k lines of Go tests (3.2k in the TUI alone) must be ported, or
  parity cannot be claimed.
- **Markdown rendering.** glamour has no exact Rust equivalent, so notes and statements
  will look different and need their own golden tests.
- **Statement fetch.** The LeetCode GraphQL response and HTML-to-markdown conversion
  (`html-to-markdown`) must give the same cached `.md` files, or existing caches go stale.
- **Toolchain.** Only a nightly `cargo` (1.101) is on `PATH`. Pin a stable toolchain in
  `rust-toolchain.toml` so CI and releases do not depend on nightly.
- **Duration.** Roughly 3-6 weeks of part-time work. Go fixes made meanwhile must be
  mirrored or frozen.

______________________________________________________________________

## Notes

- Go stays the shipping build until #13. Rule during the port: fix bugs in Go only when
  they block practice, and add each fix to the matching Rust feature.
- Go package sizes (code / tests): tui 5002/3187, catalog 606/283, cli 567/260,
  session 293/185, checkpoint 241/113, runner 235/122, schedule 227/233, app 219/158,
  placement 204/90, prompt 198/155, interview 178/100, progress 159/57, savestate 158/102,
  stats 111/86, workspace 109/111, config 103/89, watch 60/77, theme 45/45, editor 24/44.
