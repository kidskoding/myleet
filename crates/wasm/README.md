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

| Call                                                | Returns                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `trainer.plan(events, settings_json, now_ms, tz)`   | `Plan` (below)                                                                                |
| `trainer.skills(events, now_ms, tz, settings_json)` | `{techniques: [Skill], modules: [{module, title, mastery, confidence}]}`                      |
| `plan_ics(plan_json, options_json)`                 | iCalendar text; options `{site?, alarm_minutes?: number \| null, uid_suffix?, name?}` or `""` |

`Plan`:

```
{version, generated_ms, tz, start, end, interview_date,
 pace: {median_secs: {easy?, medium?, hard?}, speed: {easy, medium, hard},
        new_minutes: {easy, medium, hard}, best_hour},
 days: [{date, weekday, rest, minutes,
         sessions: [{id, start_ms, end_ms, minutes, title,
                     items: [{kind, problem, title, technique, minutes, reason, note?}]}]}],
 forecast: [{module, technique, title, module_title, companies, goal, started_now,
             projected, status, behind_by, mastery, confidence, cause}],
 summary: {days_left, sessions, minutes, reviews, new, drills, mocks, checkpoints,
           on_track, behind: [title], headline}}
```

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
 actions: [{kind, problem, note, reason}]}
```

- `mastery` and `confidence` are 0 to 1. Mastery weights recent attempts more
  (21-day half-life) and blends in the review ladder; confidence grows with attempts.
- `cause` is `cant_start`, `wrong_approach`, `edge_cases`, `too_slow`, `forgetting`
  or `null` (needs 2+ attempts and mastery under 0.7).
- Action `kind` is `read_note`, `warmup`, `edge_case_redo`, `timed_rep`,
  `spaced_redo` or `next`. `priority` ranks new work: need, company relevance
  (weighted up as the interview nears), a weak-spot bonus and reading order.
