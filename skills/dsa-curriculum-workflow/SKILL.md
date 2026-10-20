---
name: dsa-curriculum-workflow
description: "Create, revise, or rename a numbered DSA module under curriculum/ — its README, techniques, problem folders, and tests. Use when adding or reorganizing a module, changing the problem ladder, adding problems, or editing company playlists."
---

# DSA Curriculum Workflow

The single source of truth for how a numbered module is built. Two other skills
own the pieces this one delegates:

| Concern                                                      | Skill                        |
| ------------------------------------------------------------ | ---------------------------- |
| Concept notes in `notes/`                                    | `writing-notes`              |
| Exact files inside one problem folder (toml, starter, tests) | `problem-set-tests-scaffold` |
| Everything else about a module                               | this skill                   |

Do not restate note-writing rules here. `writing-notes` owns them, and a second
copy will drift.

## Curriculum Order

Modules are read in order, so a module may assume every module before it:

```text
00_fundamentals          09_backtracking
01_arrays_and_hashing    10_graphs
02_two_pointers          11_dp
03_stacks_and_queues     12_greedy_algorithms
04_sliding_window        13_intervals
05_binary_search         14_tries
06_linked_lists          15_bit_manipulation
07_trees                 16_math_geometry
08_heaps                 17_advanced
                         18_mixed_interview_practice
```

Advanced graph algorithms, sorting internals, divide and conquer, segment and
Fenwick trees, KMP, and other lower-frequency topics live in `17_advanced`.

Do not create a separate design-data-structures module. Design problems go in the
module whose pattern powers them, so LRU Cache sits with linked lists and hash
maps, and Median Finder sits with heaps. Treat grids as implicit graphs inside
`10_graphs`.

## Module Layout

Every module lives under `curriculum/` and uses the same scaffold:

```text
curriculum/NN_module/
├── module.toml                     title, priority tier, description
├── README.md                       minimal index
├── notes/                          concept notes, see writing-notes
├── reference/                      from-scratch implementations
│   └── tests/                      their tests (+ conftest.py that puts reference/ on sys.path)
└── techniques/
    └── NN_<technique>/
        ├── technique.toml          title, note = "notes/NN_topic.md"
        └── NNN_<problem>/          one folder per problem, see problem-set-tests-scaffold
```

Four layers, each of which a finished module has:

1. Concept explanation in `notes/`
2. From-scratch implementation in `reference/`
3. Tests: `reference/tests/` plus `test_problem.py` in every problem folder
4. Guided practice: the problem folders under `techniques/`, drilled through `myleet`

The `techniques/` tree is the canonical problem list. Directory number prefixes set
the order. Never create a top-level `problems/` or `tests/` folder.

## README Rules

Keep it short and index-like. Required order:

```md
# Module NN: Name

## Topics

- Topic 1
- Topic 2

## Notes

1. [Topic 1](notes/01_topic_1.md)
2. [Topic 2](notes/02_topic_2.md)

## Problem Set

The problems live in [`techniques/`](techniques/), one folder per problem. Drill them
with `myleet`: press `m`, open this module, and pick a technique.

## Additional Notes

- Optional short clarification
```

- `## Topics` holds concepts, so BFS, DFS, grid traversal, and topological sort
  go here
- `## Problem Set` is a **pointer to `techniques/`, never a copy of it**. Do not
  list the problems
- Do not add teaching prose. Long explanations
  belong in `notes/`
- Do not repeat the global mastery rule, which lives in the repo `README.md`

## Problem Ladder Rules

The ladder is the ordered set of problem folders inside each technique.

- Order problems roughly easy to hard with the number prefix (`001_`, `002_`, …)
- Folder names and `title` are concrete interview problem titles, never abstract
  lesson names like "Graph BFS"
- `key_idea` names the reusable idea in one line
- `id` is the LeetCode slug when one exists; it must be unique across the repo, so
  a problem repeated in a second module gets a `-<module>` suffix
- Each `technique.toml` points `note` at the note that teaches the technique

**Size techniques by mastery, not by a fixed count.** A technique with
fewer than 4-5 problems is a smell. Heavy modules such as trees, graphs, DP,
backtracking, and heaps should be especially broad. If migrating problems out
leaves a technique sparse, backfill it with more problems of the same technique.

**Keep each module single-technique.** A problem stays if the module's technique
solves it cleanly, even when another pattern also works. A problem that genuinely
requires chaining two or more patterns belongs in `18_mixed_interview_practice`.

## Problem Folders

One folder per problem. The starter body is `raise NotImplementedError` until the
user solves it; the trainer reports that as "not started", not as a failure.

For the exact `problem.toml` fields, starter header, test conventions, and shared
helpers in `curriculum/_lib`, use `problem-set-tests-scaffold`.

Cover empty, single, normal, and edge cases in each `test_problem.py`. A problem with
zero tests can never be passed, so every folder needs at least one.

## Company Playlists

Company sets live in `playlists/<company>.toml`: `title`, `focus`,
`review_modules`, and one ordered list of `[[entries]]` with `title` and `url`.
Entries whose LeetCode URL matches a curriculum problem are tracked by the trainer;
the rest open in the browser.

- No warmup, core, or stretch tiers
- No fixed problem count. Cover the company's core live-coding techniques
- Avoid cross-company overlap. Repeat only deliberate anchor problems, and
  otherwise pick different high-signal problems from the same technique family
- Never claim the list is an exact interview question dump

## Verification

- `go run ./cmd/myleet validate` loads the whole tree and lists every problem it finds
- `go run ./cmd/myleet check --solutions <id>` runs a reference solution, if one exists
- `uv run pytest` runs the reference-structure tests
- Keep the README, technique folders, and tests in sync in the same commit

## Gotchas

- **Never duplicate the problem list into the README.** Every module once carried
  a partial copy, and every single one had drifted: `04_sliding_window` listed 14
  problems against a workbook of 38. Two lists of the same thing always diverge.
  The README points at `techniques/`.
- **Do not restate note rules here.** If you find yourself writing about `Pattern`
  or `Intuition` sections, stop and use `writing-notes` instead.
- **Stubs use `raise NotImplementedError`, not `pass`.** The trainer treats a run
  where every failure is `NotImplementedError` as "not started"; `pass` makes the
  problem look attempted and wrong.
- **A sparse technique is the real defect, not a tidy one.** Resist trimming a
  technique to make a module look balanced. Backfill instead.
- **Duplicate ids break the catalog.** `myleet validate` refuses to load two problems
  with the same `id`, so reusing a problem in another module needs a suffixed id.
- **Tests import from `solution`, never from the starter or a sibling problem.**
  The trainer stages the attempt as `solution.py`; a test that imports another
  problem's function would depend on that problem being solved. Put shared
  verification helpers in `curriculum/_lib`.
