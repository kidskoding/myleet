<div align="center">

# myleet

**Personalized technical interview prep.**

A LeetCode trainer that learns how you solve, plans each day around your interview, and
brings every problem back until you can solve it cold.

[**Try it live**](https://myleet.anirudhkonidala.workers.dev) ·
[How it works](https://myleet.anirudhkonidala.workers.dev/how-it-works) ·
[Start here](guide/01_how_to_prep.md) ·
[Report a bug](https://github.com/kidskoding/myleet/issues)

[![CI](https://img.shields.io/github/actions/workflow/status/kidskoding/myleet/ci.yml?branch=master&style=flat-square&label=CI)](https://github.com/kidskoding/myleet/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/kidskoding/myleet/deploy.yml?branch=master&style=flat-square&label=deploy)](https://github.com/kidskoding/myleet/actions/workflows/deploy.yml)
[![Rust](https://img.shields.io/badge/rust-1.85%2B-orange?style=flat-square)](Cargo.toml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

______________________________________________________________________

## Why myleet

Fixed lists like the NeetCode 150 give everyone the same problems in the same order.
myleet starts with a 15-minute diagnostic, then builds each day from your own history:
the techniques you are weakest at, the reviews that are about to slip, and the companies
you are interviewing with.

| Fixed lists                            | myleet                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Same problems, same order for everyone | A daily plan built from your misses, hints, slow solves and interview date |
| "Done" after one accepted submission   | Mastered only after cold re-solves at 1, 3, 7, 14 and 30 days              |
| Browser tabs and scattered notes       | One place for the editor, tests, notes and 285 company practice sets       |

## Features

- **Solve in the browser.** Write Python in a real editor and run it against the tests
  with Pyodide. Nothing to install.
- **A diagnostic first.** About 15 minutes of pattern questions and real coding finds
  where you stand, topic by topic.
- **A plan that adapts.** Pick an interview date and companies, or a 15, 30 or 90-day
  roadmap. The plan reshapes after every solve and syncs to Google, Apple or Outlook
  calendars.
- **Spaced review.** Every problem climbs a 1, 3, 7, 14 and 30-day ladder. A clean pass
  climbs one rung, and a hint, a peek or going over time sends it back to 1 day.
- **Personal coaching.** Today, Plan and the result screen explain each choice from your
  data, for example which edge case tripped you up last week and why a problem is due
  today.
- **Company sets.** 285 practice sets across Big Tech, AI & Startups, Consumer and
  Business Tech, Trading Firms and the Fortune 500. Each lists its sources from recent
  candidate reports, and learners can report where they were asked a problem.
- **A notes book.** Eighteen modules of notes that teach each pattern before the drills.

## How the review ladder works

```text
1 day → 3 days → 7 days → 14 days (mastered) → 30 days
```

Every problem has a 25-minute target, about what one problem gets in a live interview.
Passing the tests with no hint, no peek at the solution and under the target climbs one
rung. Solving it again the same day does not count. A hint, a peek, running over time or
giving up drops it back to 1 day. The full rules are on the
[How it works](https://myleet.anirudhkonidala.workers.dev/how-it-works) page.

## Curriculum

720 problems in eighteen modules, ordered by interview pattern rather than textbook
chapter, plus 909 playlist-only problems in `bank/` that company sets can open.

|     | Module                   | Focus                             |
| --- | ------------------------ | --------------------------------- |
| 01  | Arrays and hashing       | maps, sets, prefix sums, Kadane   |
| 02  | Two pointers             | converging and fast-slow pointers |
| 03  | Stacks and queues        | LIFO, monotonic stack and deque   |
| 04  | Sliding window           | contiguous constraints            |
| 05  | Binary search            | sorted space, search on answer    |
| 06  | Linked lists             | pointers, reverse, merge          |
| 07  | Trees                    | DFS and BFS, BST, serialize       |
| 08  | Heaps                    | top K, two heaps, k-way merge     |
| 09  | Backtracking             | search with pruning               |
| 10  | Graphs                   | BFS and DFS, topo sort, paths     |
| 11  | Dynamic programming      | overlapping subproblems           |
| 12  | Greedy algorithms        | exchange arguments                |
| 13  | Intervals                | merge, sweep, difference arrays   |
| 14  | Tries                    | prefix queries                    |
| 15  | Bit manipulation         | masks, XOR                        |
| 16  | Math and geometry        | number theory, grids              |
| 17  | Advanced                 | union-find, Fenwick, string algos |
| 18  | Mixed interview practice | timed mixed drills                |

## Architecture

| Part    | Stack                                                    | Path                   |
| ------- | -------------------------------------------------------- | ---------------------- |
| Core    | Rust: scheduling, planning, skills, catalog (no I/O)     | `crates/core`          |
| Browser | The core compiled to WebAssembly with wasm-bindgen       | `crates/wasm`          |
| Web app | Astro, TypeScript, CodeMirror 6, Pyodide, Catppuccin     | `web/`                 |
| Backend | Cloudflare Workers in Rust (workers-rs), D1 and KV       | `worker/`              |
| Content | Problems, tests, notes and company sets as TOML + Python | `curriculum/`, `bank/` |
| CLI     | Validates content, runs reference tests, exports data    | `src/`                 |

```text
myleet/
├── crates/core/     trainer core (Rust, builds for wasm32)
├── crates/wasm/     browser bindings
├── web/             the web app (Astro)
├── worker/          API, accounts and sync (Cloudflare Workers)
├── curriculum/      18 taught modules: notes, starters, tests, solutions
├── bank/            playlist-only problems
├── playlists/       company practice sets with sources
├── guide/           start-here notes
└── src/             the myleet CLI
```

## Run it locally

You need Rust, [Bun](https://bun.sh), [uv](https://docs.astral.sh/uv/) and
[just](https://github.com/casey/just). The repo's `devenv.nix` provides all of them,
plus wasm-pack, with `devenv shell`.

```bash
git clone https://github.com/kidskoding/myleet.git && cd myleet
uv sync --group dev
just web-dev        # exports the catalog, builds the wasm core, starts the dev server
```

The dev server watches `playlists/`, `curriculum/`, `bank/` and `guide/` and reloads
when content changes.

## Contributing

Pull requests are welcome. Run the same checks CI runs before you push:

```bash
just ci             # Rust, web, content and Python checks
just cd-check       # the deploy build, without deploying
```

After adding or editing problems, run `myleet validate` and
`myleet check --solutions <id>`. New problems also need `myleet validate --lock`, with
`problem-ids.lock` committed. [CLAUDE.md](CLAUDE.md) has the full content and writing
rules.

## License

[MIT](LICENSE). Problem statements belong to their original sources, such as LeetCode,
and link back to them.
