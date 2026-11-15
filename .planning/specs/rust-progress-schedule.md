# Spec: rust-progress-schedule

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 3)

______________________________________________________________________

## Problem

A learner's history (`events.jsonl`) and save file (`progress.toml`) are the only data
myleet keeps. The Rust build must read and write both exactly like the Go build, or
switching builds would lose reviews, reset the ladder, or rewrite hand edits. The review
ladder logic (1 → 3 → 7 → 14 → 30 days, in the learner's local calendar days) must also
match, or the two builds would schedule different reviews from the same history.

## Goal

Rust `progress`, `schedule` and `savestate` modules that produce byte-identical files for
the same input as Go, read every file Go writes, and compute the same states and due
dates, proven by fixtures written by the Go build.

## User Stories

- As a learner, I want the Rust build to pick up my existing history and save file
  unchanged, so switching builds costs me nothing.
- As a learner who edits `progress.toml` by hand, I want the same validation messages and
  the same rule that unknown ids are kept, so my edits are never silently dropped.

## Requirements

### Must-have

- `progress`: event kinds and modes as string constants (unknown values are kept, not
  rejected), `Event` JSON with fields `t`, `kind`, `problem`, `attempt`, `mode`, `data`
  (omitted when empty), Go `RFC3339Nano` UTC timestamps, Go HTML escaping (`<`, `>`, `&`,
  U+2028, U+2029). `Log::open` skips unreadable lines with a `path:line` warning,
  `append` creates the folder and fsyncs, `replace` writes a backup then swaps a temp file
  in atomically. `new_attempt_id` returns 12 random hex characters.
- `schedule`: `RUNGS`, `Status`, `State`, `Outcome`, `Attempt`, `attempts`, `compute`,
  `apply`, `soft_touch`, `status_for`, matching `internal/schedule` (placement and
  checkpoint skipped, hints, peeks and restarts after a pass ignored, `left` after a test
  run is a fail, drills never move rung or due, local-day comparisons in the learner's
  timezone).
- `savestate`: `read` and `write` matching `internal/savestate`: the header text, block
  order (curriculum order, then unknown ids sorted), unseen states left out, the rung,
  `last` and `best` validation messages, syntax errors with `line N`, a missing file
  reported distinctly, and atomic writes.
- Go duration formatting for `best` (whole seconds: `45s`, `4m12s`, `1h0m0s`).

### Nice-to-have

- None.

### Out of scope

- Wiring these into commands or screens (features 4, 6 and later).
- Choosing the state directory at runtime. Until a later feature does, nothing in the Rust
  build opens the learner's real `~/.local/share/myleet/` files. Tests use temp dirs only.

## Data Model

Files, not tables: `events.jsonl` (one JSON object per line, append-only) and
`progress.toml` (one `[id]` table per started problem: `rung`, `due`, `last`, `first`,
`attempts`, `clean_passes`, `best`). The formats are unchanged.

## API Changes

None (library modules only).

## UI Changes

None.

## Edge Cases

1. **Corrupt event line**: skipped with a warning; the other lines load.
2. **Unknown event kind or mode** (from a newer build): loaded and written back unchanged.
3. **Event data containing `<`, `>` or `&`**: written with Go's `<` escapes, so files
   stay byte-identical.
4. **Pass at 23:50 and again at 00:10 the next day**: counts as a new day and climbs a rung.
5. **Save file with an unknown id**: kept and written last.
6. **Bad rung (`5d`), missing `last`, bad `best`**: rejected with the Go message naming the id.
7. **Due date across a DST change**: due is local midnight N calendar days later, not N×24h.

## Testing Criteria

### Happy path

- Port every case in `schedule_test.go`, `savestate_test.go` and `log_test.go`.
- Compatibility: a fixture `events.jsonl` and `progress.toml` written by the Go build load
  in Rust, and writing them back from Rust gives byte-identical files. `compute` over the
  fixture events equals the fixture's save file.

### Edge cases

- Corrupt line, unknown kind, HTML characters, day rollover, unknown id, bad rung, syntax
  error line number, missing file, and a DST due date (America/Chicago, 2026-11-01).

## Dependencies

- Feature 2 (catalog, for `savestate::write` order; `godur`).
- Crates: `jiff` (timezones and calendar days), `serde_json`, `getrandom`; `tempfile`
  moves to a normal dependency for atomic writes.
