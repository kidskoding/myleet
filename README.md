# myleet

[![CI](https://img.shields.io/github/actions/workflow/status/kidskoding/myleet/ci.yml?branch=master&style=flat-square&label=CI)](https://github.com/kidskoding/myleet/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/kidskoding/myleet?style=flat-square&sort=semver)](https://github.com/kidskoding/myleet/releases)
[![Go](https://img.shields.io/github/go-mod/go-version/kidskoding/myleet?style=flat-square)](go.mod)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Go Report Card](https://goreportcard.com/badge/github.com/kidskoding/myleet?style=flat-square)](https://goreportcard.com/report/github.com/kidskoding/myleet)
[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey?style=flat-square)](https://github.com/kidskoding/myleet/releases)

**Adaptive LeetCode practice in your terminal.**

myleet is a teaching-first DSA curriculum and TUI trainer for internship, co-op, and
new-grad interviews. Unlike fixed lists (NeetCode 150, etc.), it builds each day from
*your* history: weak techniques first, reviews on a spaced ladder, and company playlists
when you want to drill a target.

```text
learn a pattern → solve timed → review misses → mix topics
```

## Install

Needs [git](https://git-scm.com/) and [uv](https://docs.astral.sh/uv/) on your `PATH`
(for curriculum clone and problem tests). First launch sets those up automatically.

**Recommended** (one line):

```bash
curl -fsSL https://raw.githubusercontent.com/kidskoding/myleet/master/scripts/install.sh | sh
myleet
```

Installs into `~/.local/bin`. Add that directory to your `PATH` if the shell cannot
find `myleet`.

| Channel | Command |
| ------- | ------- |
| Install script | `curl -fsSL https://raw.githubusercontent.com/kidskoding/myleet/master/scripts/install.sh \| sh` |
| Arch (AUR) | `yay -S myleet-bin` |
| Nix | `nix run github:kidskoding/myleet` or `nix profile install github:kidskoding/myleet` |
| GitHub Releases | [download a binary](https://github.com/kidskoding/myleet/releases) |
| Go (developers) | `go install github.com/kidskoding/myleet/cmd/myleet@latest` then put `$(go env GOPATH)/bin` on `PATH` |

**From a clone** (contributors):

```bash
git clone https://github.com/kidskoding/myleet.git && cd myleet
uv sync --group dev
make install && myleet
```

| Tip         |                                                                                        |
| ----------- | -------------------------------------------------------------------------------------- |
| Updates     | `myleet update` pulls the installed curriculum and refreshes the python env            |
| Doctor      | `myleet doctor` checks python, pytest, editor, data dir                                |
| Version     | `myleet version`                                                                       |
| Custom root | `export MYLEET_ROOT=/path/to/checkout`                                                 |

## Why myleet

| Fixed lists                            | myleet                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| Same problems, same order for everyone | Today is personalized to your fails, hints, peeks, and slow solves    |
| “Done” when you AC once                | Mastery means cold redo on a review ladder (1 → 3 → 7 → 14 → 30 days) |
| Browser + scattered notes              | Terminal trainer + notes book + 200+ company playlists                |

A problem is mastered only when you can explain the pattern, pick the right shape, code
it cleanly, pass the tests, and state time/space under interview pressure.

Start with [How to prep](guide/01_how_to_prep.md) if you are new to live coding interviews.

## Screens

Press `1`-`5` or `tab`. Bottom bar shows keys for the current screen; `?` lists them all.

|     | Screen        |                                                                                                           |
| --- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `1` | **Today**     | Due reviews + new work from weak spots. Placement for first-timers; check-ins with `c` / snooze with `n`. |
| `2` | **Map**       | Guide notes → modules → techniques → problems. `n` opens notes.                                           |
| `3` | **Timed**     | Mock interview (technique hidden).                                                                        |
| `4` | **Playlists** | Company sets by recruiting track, with progress.                                                          |
| `5` | **Stats**     | Streak, mastery, heatmap, weakest techniques; reset at the bottom.                                        |

**Focus** (`enter` on a problem): statement + timer + named tests + say-aloud checklist.
Edit in your editor (`e`); tests rerun on save or `space`.

| Key      | Action               |
| -------- | -------------------- |
| `e`      | edit attempt         |
| `space`  | rerun tests          |
| `t`      | hint                 |
| `s`      | reference solution   |
| `d`      | diff vs last attempt |
| `o`      | open LeetCode        |
| `r`      | reset to starter     |
| `1`-`3`  | tick say-aloud items |
| `g`      | give up              |
| `/`      | filter this list     |
| `ctrl+k` | search everything    |
| `esc`    | back                 |

## How Today picks work

1. **Reviews** due today (most overdue first).
2. **New problems** (default 3, `new_per_day` in config), labelled:
   - **weak spot**: techniques you have started but mostly not clean-passed
   - **in progress**: started, not finished
   - **new topic**: untouched, in curriculum order

New work rotates across techniques. Playlist-only problems (`bank/`) are trackable in
playlists but never appear as new on Today or on the Map.

**Review ladder:** clean pass (green tests, no hint/peek, under time: 15m / 30m / 45m)
climbs one rung. Same-day pass does not climb. Hint, peek, overtime, or give-up drops
you to 1 day. Mastered at the 14-day rung.

## Commands

| Command                           |                                          |
| --------------------------------- | ---------------------------------------- |
| `myleet`                          | open the trainer                         |
| `myleet open <id>`                | open one problem (`myleet open two-sum`) |
| `myleet doctor`                   | check python, pytest, editor, data dir   |
| `myleet stats`                    | print progress without the TUI           |
| `myleet progress`                 | edit `progress.toml` in `$EDITOR`        |
| `myleet prompts`                  | cache problem statements for offline use |
| `myleet update`                   | pull latest curriculum (installed clone) |
| `myleet version`                  | print build version                      |
| `myleet validate`                 | load-check the curriculum                |
| `myleet check [--solutions] [id]` | run attempt or reference tests           |

## Progress & config

State lives outside the repo (like lazygit / Charm apps):

| Path                                  |                                          |
| ------------------------------------- | ---------------------------------------- |
| `~/.local/share/myleet/progress.toml` | editable save file (rung, due, attempts) |
| `~/.local/share/myleet/events.jsonl`  | history for stats / heatmap              |
| `~/.local/share/myleet/content/`      | curriculum clone (install path)          |
| `~/.config/myleet/config.toml`        | optional settings                        |

```toml
# ~/.config/myleet/config.toml
python = "/path/to/python3"    # default: content .venv, then uv, then python3
editor = "nvim"                # default: $VISUAL / $EDITOR, then nvim/vim/vi/nano
timeout = "10s"
new_per_day = 3
state_dir = "~/Dropbox/myleet" # optional: sync progress.toml + events.jsonl
```

`myleet progress` validates on close and rolls back a broken edit. Sync attempts stay
under `~/.local/share/myleet/` even if `state_dir` points elsewhere.

## Curriculum

Eighteen modules by interview pattern (not CS textbook order):

|     | Module                   | Focus                             |
| --- | ------------------------ | --------------------------------- |
| 01  | Arrays And Hashing       | maps, sets, prefix sums, Kadane   |
| 02  | Two Pointers             | converging / fast-slow            |
| 03  | Sliding Window           | contiguous constraint             |
| 04  | Stack                    | LIFO, monotonic stack/deque       |
| 05  | Binary Search            | sorted space + search-on-answer   |
| 06  | Linked Lists             | pointers, reverse, merge          |
| 07  | Trees                    | DFS/BFS, BST, serialize           |
| 08  | Heaps                    | top-K, two heaps, k-way merge     |
| 09  | Backtracking             | search with prune                 |
| 10  | Graphs                   | BFS/DFS, topo, shortest paths     |
| 11  | Dynamic Programming      | overlapping subproblems           |
| 12  | Greedy                   | exchange argument                 |
| 13  | Intervals                | merge, sweep, difference arrays   |
| 14  | Tries                    | prefix queries                    |
| 15  | Bit Manipulation         | masks, XOR                        |
| 16  | Math And Geometry        | number theory, grids              |
| 17  | Advanced                 | union-find, fenwick, string algos |
| 18  | Mixed Interview Practice | timed mixed drills                |

```text
myleet/
├── cmd/myleet/          trainer binary
├── internal/            engine + TUI (Go)
├── guide/               start-here notes
├── curriculum/          taught modules (notes, starters, tests)
├── bank/                playlist-only problems
├── playlists/           company sets
└── mock-interviews/
```

## Develop

```bash
make vet test validate   # what CI runs for Go + curriculum load
make check               # all reference solutions (slow)
uv run ruff check . && uv run ruff format --check .
uv run ty check && uv run pytest
```

## License

[MIT](LICENSE)
