# Spec: rust-session-logic

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 4)

______________________________________________________________________

## Problem

The Today queue, the placement warm-up, mock-interview picking, checkpoints and the
streak/median stats decide what a learner practices next. The Rust screens and commands
(features 6, 8 and 12) need this logic, and it must pick the same work as the Go build from
the same history, or switching builds would change a learner's plan.

## Goal

Rust `session`, `placement`, `interview`, `checkpoint` and `stats` modules that behave like
the Go packages, proven by every Go test case ported case for case.

## User Stories

- As a learner, I want the Rust Today queue to show the same reviews, new problems and
  keep-sharp drills as the Go build, so my plan does not change when I switch.
- As a learner, I want my placement and checkpoint results (stored in `events.jsonl`) to
  keep steering new problems toward my weak modules in the Rust build.

## Requirements

### Must-have

- `session::today`: due reviews (most overdue first, then reading order), then new
  problems round-robin across techniques (placement/checkpoint weak modules first, then
  started techniques by struggle, then untouched ones), slots shrink by new problems first
  finished today, and keep-sharp drills when the queue would be empty.
- `placement`: `DEFAULT_SLOTS`, `score`, `level_of`, `resolve`, `needs`, `done`, `load`,
  `encode`, `weak_modules`, `recommend`, with the same `results` event data format
  (`topic:id:outcome:module,...`, `skipped = "1"`).
- `checkpoint`: `ceiling_modules`, `default_through`, `load`, `encode`, `weak_modules`,
  `recommend`, `suggest_through` (every 3 practice passes since the last checkpoint or
  snooze), `snooze`, `module_title`, with the same event data (`through`, `results`,
  `snoozed`).
- `interview`: `ROUND_LENGTH`, `HINT_PENALTY`, `pick` (weighted by rung, recent fails,
  mixed module; distinct techniques first), `pick_checkpoint` (one per module, then
  technique diversity, then anything), `checkpoint_size`; a seeded `Rng` so picks are
  deterministic for one seed.
- `stats::compute`: status counts (unseen bank problems left out), curriculum mastery,
  streak (today or ending yesterday), per-day pass heatmap, weakest techniques (3+
  attempts, top 5 by fail + hint rate), median pass time per difficulty.

### Nice-to-have

- None.

### Out of scope

- Screens and CLI commands that call these (features 6, 8, 12).
- Matching Go's `math/rand` sequence: no test or saved file depends on it.

## Data Model

No new files. Placement and checkpoint results stay in `placement_done` /
`checkpoint_done` events in `events.jsonl`, encoded exactly as Go does.

## API Changes

None (library modules only).

## UI Changes

None.

## Edge Cases

1. **Problem id in history that the catalog no longer has**: ignored by the queue, stats,
   placement recommend and checkpoint recommend.
2. **Unseen bank problem**: never offered as new and not counted; a started one is still
   reviewed and counted.
3. **Caught up with no new slots left**: keep-sharp drills, one per technique first,
   preferring cold (7+ days) and shaky problems.
4. **Topic containing `:`**: replaced by a space when encoded, so the results still parse.
5. **More problems requested than exist**: pick returns all of them; checkpoint size caps
   at the slice.
6. **Checkpoint snooze**: resets the 3-pass cadence like a finished checkpoint.

## Testing Criteria

### Happy path

- Port every case in `queue_test.go`, `personal_test.go`, `placement_test.go`,
  `checkpoint_test.go`, `pick_test.go` and `stats_test.go` against the Go `good` fixture.

### Edge cases

- Unknown ids, bank problems, keep-sharp, `:` in topics (round trip), pick more than
  available, snooze reset, broken streak; `DEFAULT_SLOTS` resolve against the real
  curriculum.

## Dependencies

- Feature 3 (`progress`, `schedule`) and feature 2 (`catalog`). No new crates.
