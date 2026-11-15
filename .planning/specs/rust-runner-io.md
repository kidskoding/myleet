# Spec: rust-runner-io

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 5)

______________________________________________________________________

## Problem

The Focus screen and the `check` and `prompts` commands need the side-effect layer: the
learner's attempt files and snapshots, running pytest against an attempt, watching the
attempt for saves, opening `$EDITOR`, and fetching LeetCode statements. The Rust build
shares `~/.local/share/myleet/` with the Go build, so attempts, snapshots and cached
statements must use the same paths and names, or switching builds loses work.

## Goal

Rust `workspace`, `runner`, `watch`, `editor` and `prompt` modules that behave like the Go
packages of the same names, with every Go test ported case for case.

## User Stories

- As a learner, I want my in-progress attempts and snapshots to show up in the Rust build,
  so switching builds costs me nothing.
- As a learner, I want a hung solution to be killed at the timeout, child processes
  included, so the trainer never freezes.
- As a learner, I want statements I already fetched to load from the cache offline.

## Requirements

### Must-have

- `workspace`: `attempt_path`, `ensure` (copy the starter once), `snapshot` (UTC
  `20060102T150405Z.py`, skipped when equal to the latest), `snapshots` (sorted), `reset`,
  `clear_attempts`, and `diff` (unified diff with headers `<old name>` and `current`).
- `runner`: `resolve_python` (config, `MYLEET_PYTHON`, repo `.venv`, `uv run`, `python3`),
  `Runner::run` staging the code as `solution.py`, pytest with `--junitxml`, `PYTHONPATH`
  set to `curriculum/_lib`, a timeout, the process group killed on unix, JUnit parsing,
  and the `not_started` rule (every non-passing test raised `NotImplementedError`).
- `watch`: watch the parent folder (editors save by rename), only the named file,
  create/write/rename events, debounced, at most one pending signal; stops when dropped.
- `editor`: config `editor`, then `$VISUAL`, `$EDITOR`, then `nvim`, `vim`, `vi`, `nano`
  on `PATH`; an error when none exists.
- `prompt`: authored prompt wins; cache `<slug or id>.md`; premium marker
  `<key>.md.premium`; statuses `authored`, `cached`, `fetched`, `premium`, `offline`,
  `no-source`; failed fetches are not cached; atomic cache writes; HTML to markdown with
  `<sup>n</sup>` as `^n`.

### Nice-to-have

- None.

### Out of scope

- The TUI and CLI callers (features 6, 9 and 10).
- Byte-identical markdown with Go's `html-to-markdown`. Cached files are only read back,
  so a different converter does not invalidate existing caches.

## Data Model

Files only, under the data folder: `workspace/<id>/attempt.py`,
`snapshots/<id>/<stamp>.py`, `prompts/<key>.md` and `prompts/<key>.md.premium`.
Unchanged from Go.

## API Changes

None (library modules only). The LeetCode GraphQL request is unchanged.

## UI Changes

None.

## Edge Cases

1. **Editor saves by rename**: the watch still fires once.
2. **A burst of saves**: coalesced into one signal.
3. **Solution loops forever**: killed at the timeout, `timed_out` set, returns within 3 s
   of a 1 s timeout.
4. **Syntax error in the attempt**: no error, not green, the output shows `SyntaxError`.
5. **Empty cache file**: treated as missing and fetched again.
6. **GraphQL error or no network**: `offline`, nothing cached.
7. **Same LeetCode problem in two modules**: one shared cache file.

## Testing Criteria

### Happy path

- Port every case in `workspace_test.go`, `runner_test.go`, `watch_test.go`,
  `editor_test.go` and `prompt_test.go`.

### Edge cases

- All cases above. Prompt tests use a local `TcpListener` server, never the network.
  Runner tests skip when no python is found, like Go.

## Dependencies

- Feature 2 (catalog `Problem`, `Config`).
- Crates: `ureq` (HTTP), `htmd` (HTML to markdown), `notify` (file events), `similar`
  (unified diff), `roxmltree` (JUnit XML), `libc` (unix process-group kill).
