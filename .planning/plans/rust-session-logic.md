# Plan: rust-session-logic

**Spec**: .planning/specs/rust-session-logic.md
**Epic**: rust-rewrite (feature 4)
**Created**: 2026-11-14
**Status**: draft

______________________________________________________________________

## Architecture

| Component    | Type   | Purpose                                                   |
| ------------ | ------ | --------------------------------------------------------- |
| `stats`      | module | `compute` → `Summary` (counts, streak, heatmap, weakest)  |
| `placement`  | module | warm-up slots, scoring, results encode/load, recommend    |
| `checkpoint` | module | slice ceiling, cadence, results encode/load, recommend    |
| `interview`  | module | weighted problem picks for rounds and checkpoints, `Rng`  |
| `session`    | module | Today queue: reviews, personal new picks, keep-sharp      |
| `testutil`   | module | test-only helpers mirroring `internal/testutil` (Chicago) |

Results borrow from the catalog (`&'a Problem`, `&'a Module`) the way Go holds pointers;
technique identity is the `(module, technique)` index pair. Today's local day comes from a
`jiff::tz::TimeZone` passed in. `checkpoint` reuses `placement`'s outcome, level and
item types, since the Go packages define identical copies.

### New files

| File            | Location | Purpose                        |
| --------------- | -------- | ------------------------------ |
| `stats.rs`      | `src/`   | stats + tests                  |
| `placement.rs`  | `src/`   | placement + tests              |
| `checkpoint.rs` | `src/`   | checkpoint + tests             |
| `interview.rs`  | `src/`   | picks + tests                  |
| `session.rs`    | `src/`   | queue + keep-sharp + tests     |
| `testutil.rs`   | `src/`   | `#[cfg(test)]` shared fixtures |

### Files to change

| File                 | What changes                  | Why                      |
| -------------------- | ----------------------------- | ------------------------ |
| `src/lib.rs`         | register the modules          |                          |
| `src/schedule.rs`    | derive `Hash` on `Status`     | `Summary.counts` map key |
| `src/catalog/mod.rs` | derive `Hash` on `Difficulty` | `Summary.median_by_diff` |

______________________________________________________________________

## Tasks

| #   | Task                                        | Files                                   | Depends on |
| --- | ------------------------------------------- | --------------------------------------- | ---------- |
| 1   | `testutil`, `stats` with ported tests       | `src/testutil.rs`, `src/stats.rs`       | —          |
| 2   | `placement`, `checkpoint` with ported tests | `src/placement.rs`, `src/checkpoint.rs` | 1          |
| 3   | `interview` with ported tests               | `src/interview.rs`                      | 1          |
| 4   | `session` with ported queue/personal tests  | `src/session.rs`                        | 2          |

Tasks 2 and 3 are independent; 4 needs placement and checkpoint for weak modules.

______________________________________________________________________

## Testing plan

Ported Go tests cover all business logic, run against the Go `good` fixture so both
builds are checked on the same catalog. There is no data layer, API or UI.

## Gate 2

- [x] Mirrors the Go packages; times passed with a timezone like Go's `*time.Location`
- [x] All files listed; tasks small and ordered
- [x] Every spec edge case has a test
