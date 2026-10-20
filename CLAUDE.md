# myleet

## Goal

A teaching-first DSA curriculum for SWE internship, co-op, and new-grad interviews targeting Meta, Amazon, Microsoft, Apple, Google, Airbnb, Bloomberg, Coinbase, Palantir, Slack/Salesforce, TikTok/ByteDance, Oracle, NVIDIA, Snowflake, Databricks, Capital One, IBM, OpenAI, ServiceNow, Uber, and analogous FAANG+ companies.

The repo should teach concepts deeply inside numbered module folders, provide from-scratch implementations/templates, and give guided practice that builds toward timed mixed interview performance.

______________________________________________________________________

## Core Principles

- Structure the curriculum by interview pattern, not traditional CS taxonomy.
- Use the numbered module folders under `curriculum/` as the source of truth.
- Teach concepts explicitly with module READMEs, notes, examples, tests, and per-problem practice folders.
- Implement data structures from scratch when the structure itself is being learned.
- Use normal Python interview tools (`dict`, `set`, `list`, `heapq`, `deque`) in problem solutions unless the point of the problem is to implement that structure.
- Prioritize high-frequency interview patterns before low-frequency advanced algorithms.
- Keep each numbered module's problem set single-technique. A problem stays in a module if that module's technique solves it cleanly, even when another pattern (e.g. DP) is an alternative solution. A problem that genuinely requires chaining two or more patterns to solve belongs in `18_mixed_interview_practice/`, not a single-technique module.
- Company-specific drilling belongs in `playlists/`; do not claim those are exact interview question lists.

______________________________________________________________________

## Structure

```text
myleet/
├── cmd/myleet/                 the `myleet` trainer binary (Go)
├── internal/                engine (catalog, runner, scheduler, ...) and TUI
├── guide/                   start-here notes shown at the top of the map
├── curriculum/
│   ├── _lib/                shared Python helpers importable from every test
│   ├── 01_arrays_and_hashing/ … 18_mixed_interview_practice/
│   │   ├── module.toml      title, description
│   │   ├── README.md
│   │   ├── notes/           the notes book
│   │   ├── reference/       from-scratch structures + tests
│   │   └── techniques/NN_<technique>/
│   │       ├── technique.toml          title, linked note
│   │       └── NNN_<problem>/          problem.toml, starter.py, test_problem.py, [solution.py]
├── bank/                    problem bank: trackable problems playlists use that no lesson covers
├── playlists/               company sets as TOML
├── mock-interviews/
└── tools/migrate/           one-time migration from the old multi-problem files
```

Progress lives outside the repo in `~/.local/share/myleet/` (or `state_dir` from
`~/.config/myleet/config.toml`): `progress.toml` is the learner's editable save file
(the source of truth for scheduling) and `events.jsonl` is history for stats. Never
commit progress into this public repo. Learner attempts and snapshots also live in
`~/.local/share/myleet/`. Progress tracking happens in the trainer; there is no Notion
board.

______________________________________________________________________

## Priority

Highest interview review priority:

1. Arrays, strings, hash maps, sets, prefix sums, two pointers, sliding window
2. Stacks/queues, binary search, trees
3. Heaps, backtracking, graphs/grids, intervals
4. Backtracking, DP, greedy
5. Linked lists and tries
6. Union find, shortest paths, sorting internals, and advanced structures after the core is reliable

For Google specifically, overweight trees, graphs, recursion, backtracking, DP, and binary search on answer.

______________________________________________________________________

## Chapter Quality Bar

Each chapter should eventually include:

- concept explanation: what it is, when to use it, pitfalls, and complexity
- implementation: clear Python code for the structure or algorithm
- tests: `reference/tests/` for the module's from-scratch structures; `test_problem.py` in every problem folder
- guided practice: warmups, core interview problems, follow-ups, and review problems, one folder each under `techniques/`

Each problem folder holds:

- `problem.toml`: `id` (globally unique slug), `title`, `difficulty` (`easy`/`medium`/`hard`), optional `leetcode`, `url`, `key_idea`, `hints`, `prompt` (markdown), `time_target`, `say_aloud`
- `starter.py`: the signature, type hints, `# Problem N:` / blank `# Time:` / `# Space:` comments, and `raise NotImplementedError` (no key idea; it is a spoiler and lives in `problem.toml`)
- `test_problem.py`: imports from `solution` (the trainer stages the learner's attempt or the reference solution under that name); shared helpers come from `curriculum/_lib`
- `solution.py`: optional reference solution; CI runs it against the tests

After adding or editing problems, run `myleet validate` and `myleet check --solutions <id>`. Saved progress is keyed by problem `id`, so never rename or remove an id; `myleet validate` fails if a locked id disappears. After adding problems, run `myleet validate --lock` and commit `problem-ids.lock` with them. Do not create a top-level `problems/` or `tests/` folder.

### Notes

The `notes/` files across all modules are one book, read in module order by someone with no DSA or LeetCode background who is preparing for live coding interviews at top tech companies. Notes teach; the problem sets drill. Use the `writing-notes` skill for any note work — it holds the full standard, and `writing-notes/ledger.md` records what each note establishes so a later note references earlier ones instead of re-teaching them.

The bar for a note is outcome-based: after reading it, could someone who had never heard of the technique recognize it in a disguised problem, code it under pressure, and explain why it works out loud? Section structure is flexible in service of that; six things are not:

1. Explain the concept before applying it.
2. Derive the technique, never just announce it — show the brute force and why it dies.
3. Real Python, executed and verified before saving.
4. A hand trace that includes a rejected or discarded step.
5. Never re-teach what an earlier note established.
6. Something on what to say out loud, since the interview is verbal.

A note near 50 lines is still a skeleton. Reference exemplar: `17_advanced/notes/03_mst.md`.

Size each technique (each `techniques/NN_<technique>/` folder) to the number of problems that actually builds mastery of that technique — enough coverage to go from warmup to hard and drill the pattern until it is automatic, not a fixed count. Do not leave a section thin (roughly, fewer than 4-5 problems is a smell); if migrating problems out leaves a section sparse, backfill it with more problems of that same technique. The number of problems is the lever that ensures mastery, so err toward more coverage per technique rather than a minimal set.

A playlist problem that no module teaches goes in `bank/<NN_topic>/<NNN_slug>/` (same files as a curriculum problem, plus a `solution.py`), so every playlist entry is trackable. Bank problems are never offered as new on Today.

Company-specific drilling belongs in `playlists/<company>.toml`. These should be curated practice plans, not claims about exact company interview questions. Each playlist has `title`, `focus`, `review_modules`, and one ordered list of `[[entries]]` (`title`, `url`) with the main high-signal LeetCode-style problems; entries whose URL matches a curriculum problem are tracked by the trainer, the rest open in the browser. Do not split playlists into warmup/core/stretch tiers. Do not force a fixed problem count; include enough problems to cover the company's core live-coding techniques. Avoid excessive cross-company overlap by repeating only deliberate anchor problems and otherwise choosing different high-signal problems from the same technique family.

______________________________________________________________________

## Python Standards

- Python 3.11+
- pytest for testing
- type hints on all method signatures
- Files: `snake_case`
- Classes: `PascalCase`
- Methods: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
