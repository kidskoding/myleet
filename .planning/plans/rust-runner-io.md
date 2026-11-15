# Plan: rust-runner-io

**Spec**: .planning/specs/rust-runner-io.md
**Epic**: rust-rewrite (feature 5)
**Created**: 2026-11-14
**Status**: draft

______________________________________________________________________

## Architecture

| Component   | Type   | Purpose                                                    |
| ----------- | ------ | ---------------------------------------------------------- |
| `workspace` | module | attempt files, snapshots, diff                             |
| `runner`    | module | python lookup, pytest run, JUnit parse, process-group kill |
| `watch`     | module | debounced file watch handle                                |
| `editor`    | module | editor command lookup                                      |
| `prompt`    | module | LeetCode statement fetch and cache                         |

Go's `context.Context` arguments are dropped for `run` and `get`: every Go caller passes
`context.Background()`. The watch returns a handle that stops watching when dropped,
replacing context cancellation. Lookups that read the environment take it as a function
internally, so tests never change process environment variables.

### New files

| File                                                 | Location      | Purpose         |
| ---------------------------------------------------- | ------------- | --------------- |
| `workspace.rs`, `watch.rs`, `editor.rs`, `prompt.rs` | `src/`        | modules + tests |
| `mod.rs`, `junit.rs`, `python.rs`, `proc.rs`         | `src/runner/` | runner + tests  |

Runner tests reuse the Go fixtures in `internal/runner/testdata/`.

### Files to change

| File         | What changes                 | Why               |
| ------------ | ---------------------------- | ----------------- |
| `Cargo.toml` | add the crates from the spec | spec dependencies |
| `src/lib.rs` | add the five modules         |                   |

______________________________________________________________________

## Tasks

| #   | Task                                    | Files                          | Depends on |
| --- | --------------------------------------- | ------------------------------ | ---------- |
| 1   | `workspace` with ported tests           | `src/workspace.rs`             | —          |
| 2   | `editor` and `runner` with ported tests | `src/editor.rs`, `src/runner/` | —          |
| 3   | `watch` with ported tests               | `src/watch.rs`                 | —          |
| 4   | `prompt` with a local test server       | `src/prompt.rs`                | —          |

Independent; done in order.

______________________________________________________________________

## Testing plan

Ported Go tests cover every module. Runner tests need pytest from the repo `.venv`
(`uv sync`) and skip without python. Prompt tests use a local server. There is no API or
UI.

## Gate 2

- [x] Mirrors the Go packages; context replaced only where callers never cancel
- [x] All files listed; tasks small and ordered
- [x] Every spec edge case has a test
