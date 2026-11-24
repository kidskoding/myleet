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
├── Cargo.toml               Cargo workspace: the root `myleet` CLI plus crates/ (worker/ is excluded)
├── src/                     the `myleet` CLI (library + binary): everything that touches fs or processes
│   ├── main.rs, cli/        entry point and commands (validate, check, doctor, export, ...)
│   ├── app.rs               the loaded trainer (catalog, history, save file, runner)
│   ├── catalog/             loads curriculum, bank and playlists from disk; problem-ids.lock
│   ├── export.rs            `myleet export <dir>`: catalog.json, problems/, notes/, lib/ for the web app
│   ├── runner/              stages an attempt or solution and runs pytest
│   ├── savestate.rs, progress.rs progress.toml and events.jsonl on disk
│   └── testdata/            catalog (plus good.json, its export), runner and save-file fixtures
├── crates/
│   ├── core/                `myleet-core`: catalog model, schedule, session, placement, checkpoint,
│   │                        interview, stats, event lines, save-file text; no fs, builds for wasm32
│   └── wasm/                `myleet-wasm`: wasm-bindgen JSON API over core (`just wasm`); see its README
├── web/                     the web app (Astro + SolidJS islands + Bun); web/public/data (`just export`) and web/src/wasm are generated.
│                            New or reworked interactive UI is a Solid `.tsx` island; a src/scripts page script moves to
│                            Solid only when that screen is next worked on, with the full design pass (see Designing UI).
│                            `bun run dev` re-exports on content edits and proxies /api/statement to production.
│                            `just dev` serves the built site and the Worker API on localhost:8787 with a local D1,
│                            signed in as the demo learner (tools/demo/seed.py, reset each run; localhost origins only).
│                            Personal copy lives in lib/coach.ts (Today), lib/plan-copy.ts (Plan), lib/sheet-note.ts
│                            (result sheet) and crates/core/src/reason.rs ("Why this one"); guest vs account rules in lib/access.ts
├── worker/                  workers-rs backend on Cloudflare (D1, KV): auth, sync, statements, interview reports,
│                            LeetCode profile import (alfa-leetcode-api first, LeetCode GraphQL fallback; public data only)
│                            and a 3-hourly cron that keeps connected learners' recent solves in D1
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
├── bank/                    playlist-only trackable problems (not on the map / Today new)
├── playlists/               company sets as TOML; the NNN_ prefix is display order, the slug after it is permanent
├── mock-interviews/
├── tools/evidence/          collects candidate-reported problems from public posts (see its README)
├── tools/demo/              seed.py: the local-only demo learner `just dev` signs in as
├── tools/playlists/         audit.py lists sets whose focus names topics they lack; rebuild.py <slug> refits a set to its focus
└── tools/migrate/           one-time migration from the old multi-problem files
```

Interview prep: in the `PREP_DAYS` (21) before an interview with a company, `crates/core/src/planner.rs` turns the big topics its list leans on (modules, mixed practice excluded) into a checklist. Readiness comes from the skill model, which placement feeds, plus LeetCode history. A never-practiced topic ramps with its note, then a warm-up. New work goes breadth first to the least-covered topic, list problems easiest first, and dream companies wait. `Plan.prep` carries the checklist, and with no interview near, `Plan.dream` projects the same checklist for the dream companies over the plan's days without changing what it schedules; `web/src/lib/ui/prep-checklist.ts` renders it as a compact card beside the Plan headline and on the last onboarding step, and `prepChange` in `web/src/lib/sheet-note.ts` says what moved after a session.

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

- `problem.toml`: `id` (globally unique slug), `title`, `difficulty` (`easy`/`medium`/`hard`), optional `leetcode`, `url`, `key_idea`, `hints`, `prompt` (markdown), `time_target` (default 25 minutes for every difficulty), `say_aloud`
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

A playlist problem that no module teaches goes in `bank/<NN_topic>/<NNN_slug>/` (same files as a curriculum problem, plus a `solution.py`) so playlists can open it in the trainer. Those problems are playlist-only: not on the map, never offered as new on Today.

Company-specific drilling belongs in `playlists/<company>.toml`. These should be curated practice plans, not claims about exact company interview questions. Each playlist is `playlists/NNN_<company>.toml` with `title`, `group`, `focus`, `review_modules`, and one ordered list of `[[entries]]` (`title`, `url`) with the main high-signal LeetCode-style problems, most asked first; every entry's URL must match a curriculum or playlist-only (`bank/`) problem so it opens on our site; add a missing problem to `bank/` rather than leaving an entry that opens on LeetCode. Each playlist's `focus` is one sentence about live coding rounds only ("Live coding focuses on graphs, trees and heaps"), since that is what the product trains for; never online assessments, behavioral, design, debugging or culture rounds. The set's problems must match it: the first topic named gets the largest share. Cite the sources it is based on in a `# Sources (checked <date>):` comment at the top of the file, preferring United States interview reports and labelling any from other locations with the place. Do not split playlists into warmup/core/stretch tiers. Do not force a fixed problem count; include enough problems to cover the company's core live-coding techniques. Avoid excessive cross-company overlap by repeating only deliberate anchor problems and otherwise choosing different high-signal problems from the same technique family.

Playlist `group` is one of Big Tech, AI & Startups, Consumer and Business Tech, Trading Firms, Fortune 500. Bucket by recruiting/interview shape, not industry taxonomy:

- Big Tech: the top FAANG-style loops and brands (Google, Amazon, Microsoft, Meta, Apple, NVIDIA, Netflix, ByteDance / TikTok)
- AI & Startups: AI labs and hot, fast-growing, mostly private companies (OpenAI, Anthropic, Stripe, Cursor)
- Consumer and Business Tech: established public tech companies, consumer and enterprise (Uber, Salesforce, Spotify, Intel)
- Trading Firms: trading interview track (Jane Street, HRT)
- Fortune 500: big companies outside the tech recruiting track (banks, retail, airlines, defense, pharma)

The `NNN_` file prefix sets display order: within a group, lower numbers come first, and the first nine show on the companies overview. Renumber freely to reorder, but never change the slug after the prefix, because pinned companies, plans and interview reports are keyed by it.

______________________________________________________________________

## CI and deploy

Every push to master runs CI (`.github/workflows/ci.yml`), and Deploy ships the site only when CI passes, so a red check blocks the release. Keep CI green while working, not just at the end:

| You changed                                                         | Run before committing                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Rust in `src/`, `crates/` or `worker/`                              | `just ci-rust`                                                 |
| Anything in `web/`                                                  | `just ci-web` (export, wasm, build with type check, tests)     |
| Problems, notes, playlists, `bank/`                                 | `just ci-content`, then `just export` so the site sees it      |
| Python or Markdown anywhere (including `tools/`, notes and READMEs) | `just ci-python` (ruff check and format, ty, pytest, mdformat) |
| The worker, migrations or deploy config                             | `just cd-check` (the Deploy build without deploying)           |

Run `just ci` (everything) before a push that touches more than one area. Run the formatters inside the repo so they pick up `pyproject.toml` settings: `uv run ruff format .` and `uv run mdformat <file>`, never a global install. When other sessions have uncommitted work in the tree, check the commit on its own before pushing: extract it with `git archive HEAD` into a temp folder and run the checks there. A local pass on files that aren't in the commit proves nothing.

## Designing UI

Every UI change, however small, goes through the design skills before it ships: `impeccable` (critique and polish, plus its `impeccable detect` scan) and an independent `design-critic` review, with `apple-design` for motion and `design-taste-frontend` for new surfaces. Look at the rendered result at desktop and phone width before committing; the bar is Stripe and Linear polish in Catppuccin, with no italics.

## Writing for people

Personalized copy (Today, Plan, reasons, notes, result sheet, onboarding) uses complete sentences and complete thoughts, never choppy fragments like "Due 19 days ago, still settling in". Run the `humanizer` skill on every piece of prose a person will read: web pages (How it works, About, Privacy, Terms, landing), UI copy and descriptions, notes, READMEs, commit messages and PR descriptions. Docs pages should be thorough and long enough to answer the reader's real questions, with concrete numbers and examples taken from the code (for example the ladder rungs, time targets and skill thresholds in `crates/core`), never invented. Use full sentences with periods, sentence-case headings, and no em dashes. In UI copy, never end a text block with a trailing period, whether it is one sentence or several: periods go only between sentences, and the last sentence may end with "!" (at most one per block) where the voice calls for it. Long-form docs pages keep normal punctuation.

______________________________________________________________________

## Python Standards

- Python 3.11+
- pytest for testing
- type hints on all method signatures
- Files: `snake_case`
- Classes: `PascalCase`
- Methods: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
