# Plan: rust-progress-schedule

**Spec**: .planning/specs/rust-progress-schedule.md
**Epic**: rust-rewrite (feature 3)
**Created**: 2026-11-14
**Status**: draft

______________________________________________________________________

## Architecture

| Component            | Type     | Purpose                                             |
| -------------------- | -------- | --------------------------------------------------- |
| `progress`           | module   | `Event`, kinds and modes, Go-compatible JSON, `Log` |
| `schedule`           | module   | attempts, ladder `apply`/`soft_touch`, `compute`    |
| `savestate`          | module   | `progress.toml` read and write                      |
| `godur::format_secs` | function | Go `Duration.String()` after rounding to seconds    |

Times are `jiff::Timestamp`; "local day" is `jiff::civil::Date` in a `jiff::tz::TimeZone`
passed in, the way Go passes a `*time.Location`. Durations that can come from subtracting
two timestamps use `jiff::SignedDuration`.

### New files

| File                            | Location               | Purpose                 |
| ------------------------------- | ---------------------- | ----------------------- |
| `progress.rs`                   | `src/`                 | events and log + tests  |
| `schedule.rs`                   | `src/`                 | ladder + tests          |
| `savestate.rs`                  | `src/`                 | save file + tests       |
| `events.jsonl`, `progress.toml` | `src/testdata/compat/` | written by the Go build |

### Files to change

| File           | What changes                                                     | Why               |
| -------------- | ---------------------------------------------------------------- | ----------------- |
| `Cargo.toml`   | add `jiff`, `serde_json`, `getrandom`; `tempfile` to normal deps | spec dependencies |
| `src/lib.rs`   | add the three modules                                            |                   |
| `src/godur.rs` | add `format_secs`                                                | `best = "4m12s"`  |

______________________________________________________________________

## Tasks

| #   | Task                                                                                         | Files                             | Depends on |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------- | ---------- |
| 1   | `progress` with ported log tests                                                             | `src/progress.rs`, `Cargo.toml`   | —          |
| 2   | `godur::format_secs`, then `schedule` with ported tests                                      | `src/godur.rs`, `src/schedule.rs` | 1          |
| 3   | `savestate` with ported tests                                                                | `src/savestate.rs`                | 2          |
| 4   | Generate Go fixtures (temporary Go test, deleted after), add byte-identical round-trip tests | `src/testdata/compat/*`           | 3          |

Sequential: each task uses the one before it.

______________________________________________________________________

## Testing plan

Ported Go tests cover the business logic. The compatibility fixtures cover the data layer
(both files, both directions). There is no API or UI.

## Gate 2

- [x] Mirrors the Go packages; times passed as a timezone like Go's `*time.Location`
- [x] All files listed; tasks small and ordered
- [x] Every spec edge case has a test
