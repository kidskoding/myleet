# myleet

**LeetCode practice built around your weak spots.** NeetCode 150 and similar lists give
everyone the same problems in the same order. myleet watches how you actually do (fails,
hints, solution peeks, slow solves) and builds each day's plan from that: problems you
struggled with come back on a review ladder, and new problems come from the techniques
you are weakest in, each labelled with why it was picked.

It is a terminal trainer plus a DSA curriculum in Python for internship, co-op, and
new-grad live coding interviews.

## Goal

This repo is a teaching-first interview prep curriculum. It is organized around reusable live-coding patterns, not broad CS taxonomy. The target is to understand each pattern, implement it cleanly, test it, and recognize it under timed interview conditions

The practical goal is to solve most LeetCode mediums in 25-35 minutes with clear communication, clean complexity analysis, and solid edge-case handling.

## Mastery Rule

A problem is done only when you can:

1. explain the pattern
2. choose the right state, base case, or helper shape
3. write the core logic cleanly
4. pass the relevant tests
5. explain time and space complexity

## How To Prep

Start with [General Technical Interview Preparation](guide/01_how_to_prep.md) before choosing a module or company problem set.

The short version:

```text
learn pattern -> solve timed problems -> review misses -> re-solve -> mix topics
```

The notes are for understanding. The problem sets are for reps. The review loop is what makes the patterns automatic.

## The Trainer

myleet is your own LeetCode review loop. NeetCode gives everyone the same roadmap;
myleet watches how *you* do on each problem and decides when it comes back.

`myleet` is a terminal trainer that runs on top of the curriculum. You solve each problem
in your own editor; `myleet` watches the file, reruns the tests on every save, and tracks
when each problem should come back for review.

```bash
uv sync --group dev          # Python + pytest for running problem tests
go install ./cmd/myleet      # or: go run ./cmd/myleet
myleet doctor                # checks python, pytest, editor, data dir
myleet                       # open today's session
```

Run `myleet` anywhere inside the repo (or set `MYLEET_ROOT`). Your attempts and snapshots live in
`~/.local/share/myleet/`, outside the repo. Colors come from your
terminal's own palette, so the TUI follows your terminal theme.

### Progress and Save State

Your progress is a small, human-readable save file, kept outside the repo the way
lazygit, Charm apps, and Anki keep per-user state:

- `~/.local/share/myleet/progress.toml`: the save file. One block per problem with its
  rung, due date, attempts, and best time. myleet reads and writes it, and **you can
  edit it**: delete a block to reset a problem, change `due` to move a review, or set
  `rung` (1d, 3d, 7d, 14d, 30d).
- `~/.local/share/myleet/events.jsonl`: the history log behind stats and the heatmap.
  You never need to touch it.

`myleet progress` opens the save file in `$EDITOR` and checks it when you close it; a
broken edit is rolled back to the previous version. myleet also refuses to start (and
tells you the line) rather than overwrite a broken file. `myleet doctor` prints its path.

To back up or sync progress, point `state_dir` at a synced folder or private repo:

```toml
# ~/.config/myleet/config.toml
state_dir = "~/Dropbox/myleet"
```

Your in-progress code and snapshots stay in `~/.local/share/myleet/` either way.

### Screens

Five tabs sit across the top; press `1`-`5` (or `tab`) to switch. The bar at the bottom
shows the keys for the current screen, and `?` opens the full list.

| Tab | Screen    | What it does                                                            |
| --- | --------- | ----------------------------------------------------------------------- |
| `1` | Today     | Due reviews, most overdue first, then a few new problems                |
| `2` | Map       | Start-here notes, then modules → techniques → problems; `n` opens notes |
| `3` | Interview | Timed 45-minute round, technique hidden, hints cost 3 minutes           |
| `4` | Playlists | Company problem sets with progress per company                          |
| `5` | Stats     | Streak, mastery, median time, solve heatmap, weakest techniques         |

`enter` on a problem opens **Focus**: the statement on the left and a sidebar with the
timer, every test by name, and the say-it-aloud checklist (stacked on narrow
terminals). `/` searches every problem from anywhere.

Focus shows the full problem statement. Free LeetCode problems are fetched the first
time you open them and cached in `~/.local/share/myleet/prompts/` (never committed);
premium and non-LeetCode problems carry their own statement in `problem.toml`. Once a
statement is on screen, the key idea becomes the last hint, so it does not spoil the
approach.

In Focus: `e` edit, `space` rerun tests, `t` hint, `s` reference solution (when one
exists), `d` diff against your previous attempt, `o` open the problem page, `r` reset
to the starter, `1`-`3` tick the say-it-aloud items, `g` give up, `esc` back. `?` shows
the keys on any screen.

### How the Plan Is Picked

Every day, Today shows:

1. **Reviews** that are due, most overdue first (see the ladder below).

2. **New problems** (3 by default, `new_per_day` in the config), chosen from your history:

   - **weak spot**: techniques you have started where most attempts were not clean
     passes (failed, gave up, used a hint, peeked, or went over time)
   - **in progress**: other techniques you have started but not finished
   - **new topic**: techniques you have not touched yet, in curriculum order

   New problems rotate across techniques, so three new problems means three different
   techniques, each labelled with its reason.

Problems in the problem bank (`bank/`, reached from playlists and search) are never
offered as new; once you finish one, it joins your reviews like any other problem.

### Review Ladder

A problem comes back after 1, 3, 7, 14, then 30 days. A clean pass climbs one rung: all
tests green, no hint, no solution peek, and under the time target (15 minutes easy, 30
medium, 45 hard). A pass on the same day as your last attempt never climbs, so mastery
always takes a cold redo on a later day. A hint, a peek, going over time, or giving up
drops the problem back to 1 day. A problem is **mastered** once it reaches the 14-day
rung.

### Commands

| Command                             |                                                     |
| ----------------------------------- | --------------------------------------------------- |
| `myleet`                            | open today's session                                |
| `myleet open <id>`                  | open one problem, e.g. `myleet open two-sum`        |
| `myleet check [--solutions] [<id>]` | run tests for your attempts, or reference solutions |
| `myleet validate`                   | check that the curriculum loads                     |
| `myleet doctor`                     | check python, pytest, editor, and data dir          |
| `myleet stats`                      | print progress stats without the TUI                |
| `myleet prompts`                    | download every problem statement for offline use    |
| `myleet progress`                   | edit your save file (`progress.toml`) in `$EDITOR`  |

Optional config in `~/.config/myleet/config.toml`:

```toml
python = "/path/to/python3"   # default: repo .venv, then uv, then python3
editor = "nvim"               # default: $VISUAL, $EDITOR, then nvim/vim/vi/nano
timeout = "10s"               # per test run
new_per_day = 3               # new problems added to today's queue
state_dir = "~/Dropbox/myleet" # optional: where progress.toml and events.jsonl live
```

## Local Checks

CI runs these. Run them before pushing:

```bash
go vet ./... && go test ./...
go run ./cmd/myleet validate
uv run ruff check . && uv run ruff format --check .
uv run ty check
uv run pytest                # migration tooling and reference structure tests
```

Markdown is checked with `mdformat`:

```bash
uv run mdformat README.md    # or any .md path
```

## Repository Layout

```text
myleet/
├── cmd/myleet/                     the trainer binary
├── internal/                    engine and TUI (Go)
├── guide/                       start-here notes: prep, Python, complexity, interviewing
├── curriculum/
│   ├── _lib/                    shared Python helpers (ListNode, TreeNode, builders)
│   └── 01_arrays_and_hashing/
│       ├── module.toml          title, description
│       ├── notes/               the notes book for this module
│       ├── reference/           from-scratch data structures + their tests
│       └── techniques/
│           └── 01_hashing/
│               ├── technique.toml
│               └── 001_two_sum/
│                   ├── problem.toml     id, title, difficulty, link, key idea, hints
│                   ├── starter.py       what you start from
│                   ├── test_problem.py  imports from `solution`
│                   └── solution.py      optional reference solution
├── bank/                        problem bank: playlist problems no lesson covers
│   └── 01_arrays_and_strings/…  same problem folders, grouped by topic
├── playlists/                   company problem sets
├── mock-interviews/
└── tools/migrate/               one-time migration from the old layout
```

## Module Order

| Module | Technique                | Description                                                          |
| ------ | ------------------------ | -------------------------------------------------------------------- |
| 01     | Arrays And Hashing       | Hash maps and sets, prefix/suffix sums, frequency counting, Kadane's |
| 02     | Two Pointers             | Converging and fast/slow pointers on sorted or linear data           |
| 03     | Sliding Window           | Contiguous subarray/substring under a constraint                     |
| 04     | Stack                    | LIFO, monotonic stack, expression parsing, monotonic deque           |
| 05     | Binary Search            | Search a sorted space or binary-search-on-answer                     |
| 06     | Linked Lists             | Pointer manipulation, fast/slow, reversal, merge/split               |
| 07     | Trees                    | DFS/BFS recursion, BST ordering, construction, serialization         |
| 08     | Heaps                    | Priority queue: top-K, two heaps, k-way merge                        |
| 09     | Backtracking             | Exhaustive search with pruning over choices                          |
| 10     | Graphs                   | BFS/DFS, topological sort, shortest paths                            |
| 11     | Dynamic Programming      | Overlapping subproblems and optimal substructure                     |
| 12     | Greedy Algorithms        | Locally optimal choice justified by an exchange argument             |
| 13     | Intervals                | Sort by endpoint, merge, sweep line, difference arrays               |
| 14     | Tries                    | Prefix tree for word and prefix queries                              |
| 15     | Bit Manipulation         | Bitwise ops, masks, XOR tricks, bitmask enumeration                  |
| 16     | Math And Geometry        | Number theory, matrix ops, coordinate geometry                       |
| 17     | Advanced Topics          | Union-find, segment/Fenwick trees, string algorithms, bitmask DP     |
| 18     | Mixed Interview Practice | Timed mixed-pattern drilling and mock interviews                     |
