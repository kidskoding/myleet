# myleet-wasm

Browser bindings over `myleet-core`, built with `just wasm` into `web/src/wasm/`.
Every function takes and returns strings (JSON, JSONL or TOML), so the TypeScript side only calls
`JSON.parse`.

Conventions:

- `events` is the learner's `events.jsonl` text. Unreadable lines are skipped. Scheduling state is
  recomputed from it on every call.
- `now_ms` is `Date.now()`. `tz` is an IANA name such as `America/Chicago`; `""` uses the browser's
  zone.
- `seed` is any number; the same seed gives the same picks.
- Functions that return a `line` give one `events.jsonl` line without the trailing newline. Append it
  with `"\n"`, then sync it.
- Errors throw a JS `Error` with a readable message.
- `State` is
  `{status, rung, due_ms, last_ms, first_ms, attempts, clean_passes, fails, hint_attempts, best_secs}`.
  `status` is `unseen`, `learning`, `reviewing` or `mastered`. `rung` is -1 to 4. Timestamps are ms
  or `null`.
- `Item` is `{topic, problem, module, outcome, level}`. `outcome` is `clean`, `hinted`, `failed` or
  `skipped`. `level` is `strong`, `shaky` or `start here`.

## `Trainer`

`new Trainer(catalog_json)` loads `catalog.json` from `myleet export`.

| Method                                        | Returns                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `today(events, now_ms, tz, new_per_day)`      | `[{problem, index, kind, reason, why, overdue_days, state: State}]`; `kind` is `review`, `new` or `practice`, `reason` is a label or `null`, `why` is the reason line from the skill model (`due: 3-day review`, `weak spot: Graphs, 3/5 not clean, wrong approach`, `timed rep: ...`) |
| `states(events, tz)`                          | `{[problem_id]: State}` for every problem with history                                                                                                                                                                                                                                 |
| `save_file(events, tz)`                       | `progress.toml` text, the same file the CLI writes                                                                                                                                                                                                                                     |
| `stats(events, now_ms, tz)`                   | `{counts: {unseen, learning, reviewing, mastered}, mastery: [mastered, total], streak, heatmap: {"YYYY-MM-DD": passes}, weakest: [{module, module_title, technique, technique_title, fail_rate, hint_rate, attempts}], median_secs: {easy?, medium?, hard?}}`                          |
| `placement(events)`                           | `{needs, done, items: [{topic, problem}], result: {skipped, items: [Item]} \| null, weak_modules: [module_id], recommend: module_id \| null}`                                                                                                                                          |
| `placement_done(results, now_ms)`             | `line`; `results` is `[{topic, problem, passed, hints?, skipped?, over_time?}]`                                                                                                                                                                                                        |
| `checkpoint(events)`                          | `{suggest_through, default_through, ceilings: [{number, id, title}], result: {through, items: [Item]} \| null, weak_modules, recommend}`; `suggest_through` 0 means no check-in is due                                                                                                 |
| `checkpoint_pick(events, tz, through, seed)`  | `[problem_id]` for an exam through module number `through`                                                                                                                                                                                                                             |
| `checkpoint_done(through, results, now_ms)`   | `line`; `results` is `[{problem, passed, hints?, skipped?}]`                                                                                                                                                                                                                           |
| `interview_pick(events, tz, n, now_ms, seed)` | `[problem_id]`, `n` problems from different techniques                                                                                                                                                                                                                                 |

## Functions

| Function                                                      | Returns                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `event_line(kind, problem, attempt, mode, data_json, now_ms)` | `line`; `data_json` is a string-to-string object or `""` |
| `new_attempt_id()`                                            | 12 hex characters                                        |
| `placement_skip(now_ms)`                                      | `line` that marks the diagnostic as skipped              |
| `checkpoint_snooze(through, now_ms)`                          | `line` that postpones the suggested check-in             |
| `format_secs(secs)`                                           | `45s`, `4m12s`, `1h0m0s`                                 |
| `interview_rules()`                                           | `{round_secs, hint_penalty_secs}`                        |

Event kinds and modes are the strings in `myleet_core::progress::{kind, mode}`, such as `opened`,
`test_run` (`data: {passed, total}`), `passed` (`data: {elapsed_ms}`) and `gave_up`, in mode
`practice`, `drill` or `interview`.

## Planner and skills

`Settings` is the account `settings` object from `GET /api/me` (unknown fields are
ignored, missing ones default): `{interview_date?, target_companies?, new_per_day?, daily_minutes?, session_minutes?, availability?: [{days: ["mon", ...], start: "HH:MM", end: "HH:MM"}], days_off?: ["YYYY-MM-DD"]}`. Pass `""` for defaults.

Three device-local fields extend it (the Worker does not store them yet):
`weekend_minutes?` (Saturday and Sunday budget, `daily_minutes` when unset),
`day_minutes?: {"YYYY-MM-DD": minutes}` (one-day budget, "Shorter day") and
`moves?: [{from, from_start, to, to_start, minutes}]` (a dragged session: that much time
leaves `from` at `from_start` and opens a window on `to` at `to_start`; both days are
refilled, so the moved block holds what is due on its new day).

| Call                                                | Returns                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `trainer.plan(events, settings_json, now_ms, tz)`   | `Plan` (below)                                                                                |
| `trainer.skills(events, now_ms, tz, settings_json)` | `{techniques: [Skill], modules: [{module, title, mastery, confidence}]}`                      |
| `plan_ics(plan_json, options_json)`                 | iCalendar text; options `{site?, alarm_minutes?: number \| null, uid_suffix?, name?}` or `""` |
| `trainer.plan_fixes(events, settings_json, now_ms, tz)` | `{techniques: [{module, technique, weekday_minutes \| null}], all: minutes \| null, note: Note \| null}`: the smallest weekday budget (30 to 120 in 15-minute steps) that closes each gap, one that closes every gap, and the over-budget note |
| `trainer.habits(events, now_ms, tz, limit)` | `{history: {sessions, cells: [[weekday 0-6, half-hour 0-47]], suggestion: {windows, sessions, text} \| null}, insights: [{kind, icon, text}]}`; `text` marks the two facts with `**bold**`; a suggestion needs 8 sittings in 4 weeks |
| `trainer.attempt_feedback(events, attempt_id, now_ms, tz)` | `{module, technique, technique_title, before, after, trend, text, cleared, weak_spot}` (levels `new`, `shaky`, `building`, `solid`, `strong`) or `null` |

`Plan`:

```
{version, generated_ms, tz, start, end, interview_date,
 pace: {median_secs: {easy?, medium?, hard?}, speed: {easy, medium, hard},
        new_minutes: {easy, medium, hard}, best_hour, review_minutes, sample, habit},
 days: [{date, weekday, rest, minutes, cap, off, windows: [{start, end}],
         sessions: [{id, start_ms, end_ms, minutes, title, moved_from?,
                     items: [{kind, tag, problem, title, technique, minutes, reason, note?,
                              chips?: [{icon, text}]}]}]}],
 forecast: [{module, technique, title, module_title, companies, goal, started_now,
             projected, status, behind_by, mastery, confidence, cause}],
 summary: {days_left, sessions, minutes, reviews, new, drills, mocks, checkpoints,
           on_track, behind: [title], headline},
 notes: [{kind, title, body, actions: [{kind, label, value?}]}]}
```

- `tag` is the item's reason tag (`review`, `weak`, `new`, `progress`, `sharp`, `mock`,
  `check`); `weak` needs 4+ attempts in the last 6 weeks. `reason` never repeats the tag
  word; `chips` are up to three short "why this one" phrases with a Lucide icon name.
- `windows` are the whole day's practice windows with moves applied (today's are not
  trimmed to now); `cap` is the day's budget, 0 on a day off.
- `notes` kinds: `date_passed`, `cram`, `away`, `missed`, `great_day`, `backlog`, newest
  first; action kinds `weekday_minutes` (`value`), `availability`, `set_date`,
  `clear_date`. The over-budget note comes from `plan_fixes`.

- `kind` is `review`, `new`, `drill`, `note` (re-read `note`, a content path), `mock`
  or `checkpoint`. Every item has a `reason`.
- `status` is `on_track` or `behind`; `cause` is a skill cause or `null`.
- Session `id` is `YYYY-MM-DD-N`, stable for a day and slot.
- The plan runs from today to the day before `interview_date`, or 28 days without
  one (at most 182). Recompute it on load and after each attempt: missed work rolls
  forward, never past `daily_minutes`.

`Skill`:

```
{module, module_title, technique, technique_title, mastery, confidence,
 trend: "improving" | "flat" | "slipping" | null, cause, weak, need, priority,
 companies: [{company, problems}], seen, total,
 evidence: {attempts, passes, clean, fails, hinted, peeked, gave_up, restarted,
            cant_start, wrong_approach, edge_cases, too_slow, forgot},
 actions: [{kind, problem, note, reason, title, minutes}],
 level, sureness, recent, weak_spot, watch, diagnosis,
 history: [{problem, title, date, mark, cause, detail}], clean_per_week: [n x 6],
 technique_number, techniques_in_module}
```

- `level` is `new`, `shaky` (< 0.35), `building` (< 0.65), `solid` (< 0.85) or
  `strong`. `sureness` reads `recent` (attempts in the last 6 weeks): `none`,
  `first_read` (1-3), `fairly_sure` (4-5), `sure` (6+). `weak_spot` is `weak` with 4+
  recent attempts; `watch` is a first read with a cause (shown as Watching, never weak).
- `diagnosis` is the plain-words reading: counts, then the cause, then what was right.
  `history` is the last 6 attempts, oldest first; `mark` is `clean`, `missed`, `hint` or
  `over`. `clean_per_week` ends with the current 7 days.

- `mastery` and `confidence` are 0 to 1. Mastery weights recent attempts more
  (21-day half-life) and blends in the review ladder; confidence grows with attempts.
- `cause` is `cant_start`, `wrong_approach`, `edge_cases`, `too_slow`, `forgetting`
  or `null` (needs 2+ attempts and mastery under 0.7).
- Action `kind` is `read_note`, `warmup`, `edge_case_redo`, `timed_rep`,
  `spaced_redo` or `next`. `priority` ranks new work: need, company relevance
  (weighted up as the interview nears), a weak-spot bonus and reading order.
