# Spec: rust-catalog-config-validate

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 2)

______________________________________________________________________

## Problem

Every later Rust feature (schedule, queue, runner, screens) needs the curriculum in memory:
modules, techniques, problems, the bank and playlists. Today only Go can load it. Without
a Rust loader that agrees with Go on every problem, id and error, the port has nothing to
build on, and a mismatch would silently show learners different problems.

## Goal

`myleet-rs validate` and `myleet-rs validate --lock` behave like `myleet validate` on the
real repo and on the Go fixtures. Same counts, same lock file, same exit codes, and the
same error lines (TOML parser wording aside). `config.toml` loads with the same defaults.

## User Stories

- As the maintainer, I want `myleet-rs validate` to report
  `ok: N curriculum problems, M playlist-only, P playlists` with the same numbers as Go,
  so I can trust the Rust catalog before porting anything that uses it.
- As a curriculum author, I want a removed or renamed problem id to fail validation with
  the same explanation, so saved progress keyed by id is never orphaned.

## Requirements

### Must-have

- `catalog` module: `Difficulty` (easy, medium, hard; `short()` gives `med`), default
  time targets (15m, 25m, 45m), default say-aloud list, `Module`, `Technique`, `Problem`,
  `PlaylistEntry`, `Playlist`, `GuideNote`, `Catalog` with `problem(id)`, `problems()`,
  `curriculum()`, `lib_dir()`, `ids()`. Parents are indices, not pointers.
- `load(root)` matching `internal/catalog/load.go`:
  - numbered directories (`NN_name`), sorted by number;
  - `module.toml`, `technique.toml` (note path must exist), `problem.toml` (id required,
    difficulty valid, `starter.py` and `test_problem.py` present, `time_target` in Go
    duration syntax);
  - the bank (`bank/bank.toml`, skipped quietly when missing);
  - guide notes and `note_title`;
  - playlists with the five groups, URL to problem resolution by LeetCode slug (first
    problem wins), and a stable sort by group;
  - duplicate ids;
  - every error collected as `relative/path: message`, joined by newlines.
- `find_root` matching `FindRoot`: `MYLEET_ROOT` wins and must contain `curriculum/`;
  otherwise walk up from the current directory. Same error wording.
- Lock: `read_lock` (missing file is "no lock", not an empty lock), `write_lock`
  (sorted ids, newline-terminated).
- `config` module matching `internal/config`: defaults (timeout 10s, 3 new per day),
  `load_file`, `load` (missing file is defaults), `path()`, `data_dir()` from XDG with
  home fallbacks, `state_dir_path()` with `~` expansion.
- A Go duration parser (`h`, `m`, `s`, `ms`, `us`, `µs`, `ns`, decimals, combined) for
  `time_target` and `timeout`.
- `validate` command with the Go output lines, colors only when the stream is a terminal
  and `NO_COLOR` is unset.

### Nice-to-have

- A test that loads the real repo and checks every id in `problem-ids.lock` is present.

### Out of scope

- Cloning the curriculum when no checkout is found (`EnsureRoot`, `BootstrapContent`,
  `ensureVenv`, `UpdateContent`, `RootKind`). These come with first-run setup in the CLI
  feature (#6). Until then `validate` outside a checkout fails with the `FindRoot` error.
- Any other command (`check`, `doctor` and so on).
- Reading or writing progress.

## Data Model

No database. Inputs are the curriculum TOML files and `config.toml`. The only file written
is `problem-ids.lock`, and only with `--lock`, in the same format as Go.

## API Changes

CLI only: `myleet-rs validate [--lock]`. Exit 0 when valid, 1 on any load or lock error.

## UI Changes

None (terminal output lines only).

## Edge Cases

1. **Missing `bank.toml`**: no bank module and no error. Any other bank read or parse
   error is reported.
2. **Duplicate id across folders**: the second is reported as
   `duplicate id "x" (also <first dir>)` and skipped. Loading continues and all errors
   print together.
3. **Empty lock file vs. no lock file**: an empty file is a lock with zero ids, so every
   id counts as new and the reminder prints. No file means no lock and no reminder.
4. **Playlist URL with or without a trailing slash** resolves to the same problem. A URL
   that is not on LeetCode is compared with its trailing slashes trimmed.
5. **Invalid `time_target`** (`"20 minutes"`): reported, and the problem is skipped.
6. **`MYLEET_ROOT` set to a folder without `curriculum/`**: fails with the Go message
   and does not fall back to walking up.
7. **Unknown keys in TOML** (for example `review_modules`) are ignored, like Go.

## Testing Criteria

### Happy path

- Load `internal/catalog/testdata/good`: problem order
  `p-one,p-two,p-three,two-sum,logger-rate-limiter`, `order` matches the index, defaults
  (15m easy, 20m override, 45m hard), hints, key idea, say-aloud default and override,
  parent titles and ids, technique note path, 2 module notes, starter, test and lib paths.
- Playlists: 2 loaded; `01_meta` entry 0 resolves to `two-sum`, entry 1 is external.
- `validate` on a copy of `good`: exit 0 and
  `ok: 4 curriculum problems, 1 playlist-only, 2 playlists`.
- `validate` on the real repo prints the same line as Go's `myleet validate`.

### Edge cases

- Load `bad`: the error mentions `duplicate id "dup"`, `test_problem.py` and
  `invalid difficulty "brutal"`.
- `validate` with a lock that lists `gone-problem`: exit 1, and the output names the id
  and mentions progress.
- `validate --lock` writes exactly the 5 sorted fixture ids.
- A lock with only `p-one`: exit 0 with `4 new problem ids` and `--lock`.
- `find_root`: walks up from a nested dir; `MYLEET_ROOT` wins; a bad `MYLEET_ROOT` fails;
  outside any repo fails.
- Config: defaults; `timeout = "20s"` and `new_per_day = 5`; a missing file gives
  defaults; XDG and home fallbacks; `~/x` expands.
- Durations: `20m`, `1h30m`, `1.5h`, `500ms`, `10s`; `20 minutes` and empty strings fail.

## Dependencies

- Feature 1 (crate scaffold).
- Crates: `serde` (derive) and `toml`; dev only: `tempfile`.
- Fixtures: `internal/catalog/testdata/{good,bad}`, shared with Go until cutover.
