# myleet worker

The myleet backend: one Cloudflare Worker written in Rust ([workers-rs]). It serves
the Astro site's static files from `../web/dist`, and handles `/api/*`:

- accounts: sign in with GitHub, Google or an emailed magic link (no passwords),
  linked into one account by verified email
- sessions you can list and revoke, settings, account export and deletion
- LeetCode problem statements, fetched once and cached in KV
- progress sync: one versioned D1 row per user holding `events.jsonl` and the Notes
  reader's highlights
- opt-in public profiles for shareable progress cards
- the learner's computed plan and a private calendar feed (ICS) of it
- "I was asked this" reports: `POST /api/reports` adds or removes one, and
  `GET /api/reports?problem=<id>` returns per-company counts once 3 learners agree

It is a separate crate with its own `[workspace]`, so the root workspace does not
build it. Only `src/api.rs` uses the Workers runtime; everything else is plain Rust
with native unit tests.

## Layout

| Path               | What it holds                                                       |
| ------------------ | ------------------------------------------------------------------- |
| `src/api.rs`       | Routing, D1, KV and outbound fetches (wasm32 only)                  |
| `src/account.rs`   | Email and username rules, settings, account linking, public summary |
| `src/oauth.rs`     | GitHub and Google OAuth URLs, token exchange, profile parsing       |
| `src/magic.rs`     | Magic-link email and rate-limit counters                            |
| `src/session.rs`   | Session tokens, cookies, CSRF origin check                          |
| `src/statement.rs` | LeetCode GraphQL reply to markdown, premium detection               |
| `src/sync.rs`      | Progress upload validation and version conflicts                    |
| `src/calendar.rs`  | Plan upload validation, feed tokens, subscribe links, ICS body      |
| `src/reports.rs`   | Interview report validation and the 3-reporter threshold            |
| `build.rs`         | Bakes the company slugs from `../playlists` into the Worker         |
| `migrations/`      | D1 schema, applied with `wrangler d1 migrations apply`              |
| `wrangler.toml`    | Worker config: bindings, public vars, static assets                 |

## Tooling

Run everything inside the repo's dev shell (`devenv shell`), which has Rust with the
`wasm32-unknown-unknown` target and Bun. JS tooling uses Bun; wrangler is a pinned
dev dependency:

```sh
cd worker
bun install
```

`wrangler` builds the wasm with [`worker-build`]. The build command installs it on
first use with `cargo install`, which needs OpenSSL headers. The devenv shell has
none, so install it once from a shell that does, for example:

```sh
nix shell nixpkgs#openssl.dev nixpkgs#pkg-config --command cargo install --locked worker-build@0.9.0
```

## One-time setup

Do these once before the first deploy. All `wrangler` commands below need you to be
logged in (`bunx wrangler login`).

1. **Create the D1 database** and put its id in `wrangler.toml` (`database_id`):

   ```sh
   bunx wrangler d1 create myleet
   ```

2. **Create the KV namespace** and put its id in `wrangler.toml` (`kv_namespaces.id`):

   ```sh
   bunx wrangler kv namespace create STATEMENTS
   ```

3. **Apply the schema:**

   ```sh
   bun run migrate          # remote
   bun run migrate:local    # local dev database
   ```

4. **Set `SITE_ORIGIN`** in `wrangler.toml` to the site's origin, for example
   `https://myleet.dev` (scheme and host, no trailing slash). OAuth callbacks, magic
   links, CORS and the CSRF check all use it.

5. **Register a GitHub OAuth app** at GitHub, Settings, Developer settings, OAuth Apps,
   New OAuth App:

   - Homepage URL: `SITE_ORIGIN`
   - Authorization callback URL: `SITE_ORIGIN/api/auth/github/callback`

   Put the client id in `GITHUB_CLIENT_ID` and generate a client secret.

6. **Create a Google OAuth client** in Google Cloud Console, APIs & Services:
   configure the OAuth consent screen (scopes `openid`, `email`, `profile`), then
   Credentials, Create credentials, OAuth client ID, type Web application:

   - Authorized JavaScript origin: `SITE_ORIGIN`
   - Authorized redirect URI: `SITE_ORIGIN/api/auth/google/callback`

   Put the client id in `GOOGLE_CLIENT_ID`.

7. **Set up Resend** for magic-link email: add and verify your sending domain at
   [resend.com](https://resend.com), create an API key with sending access, and set
   `EMAIL_FROM` in `wrangler.toml` to an address on that domain, for example
   `myleet <login@myleet.dev>`.

8. **Set the secrets.** Each command prompts for the value; secrets never go in the
   repo:

   ```sh
   bunx wrangler secret put GITHUB_CLIENT_SECRET
   bunx wrangler secret put GOOGLE_CLIENT_SECRET
   bunx wrangler secret put RESEND_API_KEY
   ```

### Config reference

| Name                   | Kind       | Purpose                                  |
| ---------------------- | ---------- | ---------------------------------------- |
| `SITE_ORIGIN`          | var        | Site origin: redirects, CORS, CSRF check |
| `GITHUB_CLIENT_ID`     | var        | GitHub OAuth app client id               |
| `GOOGLE_CLIENT_ID`     | var        | Google OAuth client id                   |
| `EMAIL_FROM`           | var        | Sender for magic-link email              |
| `GITHUB_CLIENT_SECRET` | secret     | GitHub OAuth app secret                  |
| `GOOGLE_CLIENT_SECRET` | secret     | Google OAuth client secret               |
| `RESEND_API_KEY`       | secret     | Resend API key                           |
| `DB`                   | D1 binding | Accounts, sessions, settings, progress   |
| `STATEMENTS`           | KV binding | Statement cache and rate-limit counters  |

## Local development

```sh
cp .dev.vars.example .dev.vars   # fill in; gitignored
bun run migrate:local
bun run dev                      # http://localhost:8787
```

`wrangler dev` runs D1 and KV locally, so nothing touches your Cloudflare account. It
serves `../web/dist`, so build the site first (that directory must exist). For OAuth
locally, register separate dev OAuth apps whose callback URLs use
`http://localhost:8787`, and set `SITE_ORIGIN=http://localhost:8787` in `.dev.vars`.
Browsers accept the `Secure` session cookie on `localhost`.

Tests and checks:

```sh
cargo test --manifest-path worker/Cargo.toml
cargo clippy --manifest-path worker/Cargo.toml --all-targets -- -D warnings
cargo clippy --manifest-path worker/Cargo.toml --target wasm32-unknown-unknown -- -D warnings
cargo fmt --manifest-path worker/Cargo.toml --check
```

## Deploy

```sh
bun run deploy
```

This builds the wasm (`worker-build --release`) and uploads the Worker and the
contents of `../web/dist`.

## API reference

Every response is JSON unless noted. Errors are `{"error": "<message>"}`. Requests
that change state (`POST`, `PUT`, `PATCH`, `DELETE`) with an `Origin` header other than
`SITE_ORIGIN` get `403`. CORS is allowed for `SITE_ORIGIN` only, with credentials.
"Signed in" means a valid `__Host-myleet_session` cookie; without one, those
endpoints return `401`.

### Statements

`GET /api/statement?slug=<leetcode-slug>`

```json
{"status": "fetched", "markdown": "Given an array ..."}
```

`status` is `fetched` (fetched now), `cached`, `premium` (LeetCode premium; markdown
is empty), `none` (no such problem) or `offline` (LeetCode failed; try later). A bad
slug is `400`. Results other than `offline` are cached in KV (90 days for statements
and premium, 7 days for `none`), so LeetCode sees at most one request per problem.

### Sign-in

| Endpoint                            | What it does                                                      |
| ----------------------------------- | ----------------------------------------------------------------- |
| `GET /api/auth/providers`           | `{"github", "google", "email"}`: which sign-in methods are set up |
| `GET /api/auth/github`              | Redirects to GitHub (scope `user:email`)                          |
| `GET /api/auth/github/callback`     | OAuth callback                                                    |
| `GET /api/auth/google`              | Redirects to Google (scopes `openid email profile`)               |
| `GET /api/auth/google/callback`     | OAuth callback                                                    |
| `POST /api/auth/email`              | Body `{"email": "..."}`. Sends a magic link: `202 {"sent": true}` |
| `GET /api/auth/email/verify?token=` | The link in the email. Single use, expires in 15 minutes          |
| `POST /api/auth/logout`             | Revokes this session and clears the cookie: `204`                 |

A successful sign-in redirects to `SITE_ORIGIN/` with the session cookie (30 days). A
failed one redirects to `SITE_ORIGIN/?auth_error=<reason>`, where reason is `denied`
(declined at the provider), `state` (stale or forged callback), `email` (the provider
has no verified email), `link` (unknown, used or expired magic link) or `upstream`
(provider failed).

Accounts link by verified email: signing in with GitHub, Google or a magic link for
an address that already has an account adds that sign-in method to it. GitHub
accounts with no verified email cannot sign in.

`POST /api/auth/email` answers the same whether or not an account exists. It is
limited to 5 emails per address and 20 per IP per hour (`429` beyond that).

### Account

`GET /api/me`

```json
{
  "user": {"id": "9f2c...", "email": "ann@example.com", "username": "ann",
           "display_name": "Ann", "avatar_url": "https://...", "created_at": 1794700000000},
  "providers": ["github", "email"],
  "settings": {"theme": "system", "night_flavor": "mocha", "accent": "mauve",
               "editor_keymap": "vim", "editor_font_size": 14,
               "new_per_day": 3, "interview_date": "2027-02-01",
               "target_companies": ["google"], "reminders": false, "public_profile": false,
               "daily_minutes": 60, "session_minutes": 45,
               "availability": [{"days": ["mon", "tue", "wed", "thu", "fri"], "start": "19:00", "end": "20:30"},
                                {"days": ["sat"], "start": "10:00", "end": "12:00"}],
               "days_off": ["2026-11-26"], "reminder_minutes": 15,
               "weekend_minutes": 120, "day_minutes": {"2026-11-20": 30},
               "moves": [{"from": "2026-11-17", "from_start": "19:00", "to": "2026-11-19",
                          "to_start": "07:00", "minutes": 60}],
               "reminder_time": "19:00", "reminder_lead": 15,
               "quiet_from": "23:00", "quiet_to": "08:00",
               "time_targets": {"easy": 15, "medium": 25, "hard": 40},
               "reduce_motion": false, "editor_ligatures": true, "editor_minimap": false,
               "editor_indent": 4, "editor_format_on_save": true, "editor_run_on_save": false,
               "goal": "newgrad", "plan_started_at": "2026-11-01", "onboarded": true}
}
```

Everything after `reminder_minutes` except `night_flavor` and `accent` is absent until
it is first set, so a device that already has a value keeps it (and uploads it) instead
of taking a default. They are stored in one JSON column (`user_settings.extra`), so
adding another needs no migration.

`PATCH /api/me` takes any subset of
`{"username": "...", "display_name": "..." | null, "settings": {...}}` (settings
fields as above, each optional; `interview_date: null` clears it). It returns the same
body as `GET /api/me`. Validation:

- `username`: 3-30 characters of `a-z 0-9 - _`, starting with a letter or digit,
  not a reserved word (`admin`, `api`, `u`, ...). Taken is `409`.
- `display_name`: up to 60 characters, no control characters; `null` or empty clears.
- `theme`: `system`, `latte`, `frappe`, `macchiato` or `mocha` (Catppuccin; legacy
  `light` and `dark` are accepted and read as `latte` and `mocha`). `night_flavor`, the
  dark flavor `system` uses: `frappe`, `macchiato` or `mocha` (default). `accent`: one
  of `rosewater flamingo pink mauve red maroon peach yellow green teal sky sapphire blue lavender` (default `mauve`). `editor_keymap`: `standard` or `vim`.
  `editor_font_size`: 10-28. `new_per_day`: 0-20. `interview_date`: `YYYY-MM-DD`.
  `target_companies`: up to 40 company slugs (a playlist id without its `NNN_` prefix,
  so `a-z 0-9 - _`).
- Planner: `daily_minutes` 15-600 (default 60), `session_minutes` 15-240 (default 45),
  `availability` up to 21 weekly windows (`days` from `mon`...`sun`, `HH:MM` times,
  start before end, `end` may be `24:00`; empty means "plan around the hour I usually
  practise"), `days_off` up to 366 dates, `reminder_minutes` 0-1440 or `null` for no
  calendar alarm (default 15). These names match `myleet-core`'s planner settings, so
  the client passes `settings` to the wasm `plan()` unchanged.
- Plan overrides: `weekend_minutes` 15-600 or `null` (same as weekdays),
  `day_minutes` up to 100 `YYYY-MM-DD` to 0-600 one-day budgets, `moves` up to 100
  dragged sessions (`from`/`to` dates, `from_start`/`to_start` `HH:MM`, `minutes` 1-1440).
- Browser reminders: `reminders` (on/off), `reminder_time`, `quiet_from`, `quiet_to`
  (`HH:MM`; quiet hours may wrap midnight), `reminder_lead` 0-1440. The calendar alarm
  is `reminder_minutes`.
- Device prefs: `time_targets` (`easy`, `medium`, `hard`, each 1-240 minutes),
  `reduce_motion`, `editor_ligatures`, `editor_minimap`, `editor_indent` (2 or 4),
  `editor_format_on_save`, `editor_run_on_save`; onboarding: `goal` (`internship`,
  `coop`, `newgrad` or `null`), `plan_started_at` (`YYYY-MM-DD` or `null`), `onboarded`.
- The body is at most 64 KB. Unknown fields are `400`.

`GET /api/me/export` downloads `myleet-export.json` with the profile, sign-in methods,
settings (all of the above), sessions, progress (with `notes_json`), the stored plan and the calendar feed's creation time
(never its token).

`DELETE /api/me` deletes the account and every row that belongs to it, then clears
the cookie: `204`.

### Sessions

`GET /api/sessions`

```json
{"sessions": [{"id": "271a...", "created_at": 1794700000000, "expires_at": 1797292000000,
               "user_agent": "Mozilla/5.0 ...", "current": true}]}
```

`DELETE /api/sessions/<id>` revokes one of your sessions: `204`, or `404` if it is
not yours. Revoking the current one also clears the cookie.

### Progress sync

`GET /api/progress`

```json
{"events_jsonl": "{\"t\":...}\n...", "version": 4, "updated_at": 1794700000000,
 "notes_json": "{\"v\":1,\"annotations\":[...],\"reads\":{...}}"}
```

Before the first sync it returns `version: 0`, empty events and `updated_at: null`.
`notes_json` is `null` until a client sends one.

`PUT /api/progress`

```json
{"base_version": 4, "events_jsonl": "...", "notes_json": "{...}",
 "summary": {"streak": 5, "mastered": 12, "solved": 40, "heatmap": {"2026-11-14": 3}}}
```

- `base_version` is the version the client last saw (0 if it has never synced).
- `events_jsonl` replaces the stored events; each non-blank line must be a JSON
  object. At most 1,750,000 bytes (D1 caps a row at 2 MB); larger is `413`.
- `notes_json` is optional: the Notes reader's highlights, margin notes and reading
  progress as one JSON object, `{"v": 1, "annotations": [{"id", "note", "updated", ...}], "reads": {"<note path>": {...}}}`. It shares the row and its version, so a
  sync that carries it is still one row write. The Worker checks the shape (at most
  2,000 annotations with 1-64 character ids and note paths up to 300 characters,
  2,000 reads) and stores it unchanged; at most 150,000 bytes, larger is `413`.
  Leaving it out keeps the stored copy. Deletions are tombstones
  (`"deleted": true`) so a merge never brings a removed highlight back.
- `summary` is optional and powers the public profile. The client computes it
  because it owns the scheduler. Leaving it out keeps the stored summary.

Success is `200 {"version": 5, "updated_at": ...}`. If another device synced first,
the response is `409` with the stored copy, so the client can merge (events by
union, annotations by id keeping the newer `updated`) and retry with the new `version`:

```json
{"error": "stale base_version: merge with current and retry",
 "current": {"events_jsonl": "...", "version": 5, "updated_at": 1794700000000, "notes_json": "..."}}
```

### Public profile

`GET /api/u/<username>` returns a profile only if its owner turned on
`settings.public_profile`; otherwise `404`, the same as for a missing user:

```json
{"username": "ann", "display_name": "Ann", "avatar_url": "https://...",
 "summary": {"streak": 5, "mastered": 12, "solved": 40, "heatmap": {"2026-11-14": 3}},
 "updated_at": 1794700000000}
```

### Plan

The client computes the plan in wasm (`Trainer.plan`) and uploads it so the
calendar feed can serve it while the browser is closed.

`PUT /api/plan` with `{"plan": <plan JSON from Trainer.plan>}` (at most 1 MB; a body
that is not a valid plan is `400`, larger is `413`) answers
`200 {"changed": true, "updated_at": ...}`. An identical plan writes nothing
(`changed: false`). Upload after each sync and whenever the plan changes; once a
day is plenty for the feed.

`GET /api/plan` returns `{"plan": {...} | null, "updated_at": ... | null}`.

### Calendar feed

| Endpoint                        | What it does                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/calendar`             | `{"enabled", "created_at", "plan_updated_at"}`                                          |
| `POST /api/calendar/token`      | Creates the feed, or rotates it (the old URL stops at once): `201` with the links below |
| `DELETE /api/calendar/token`    | Revokes the feed: `204`                                                                 |
| `GET /api/calendar/<token>.ics` | The feed. No cookie; the token is the credential                                        |

```json
{"https_url": "https://myleet.dev/api/calendar/<token>.ics",
 "webcal_url": "webcal://myleet.dev/api/calendar/<token>.ics",
 "google_url": "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2F...",
 "outlook_url": "https://outlook.live.com/calendar/0/addfromweb?url=...&name=myleet%20plan",
 "outlook365_url": "https://outlook.office.com/calendar/0/addfromweb?url=...&name=myleet%20plan",
 "created_at": 1794700000000}
```

- The token is 32 random bytes; D1 stores only its SHA-256, so the URL is shown once,
  in the `POST` reply. To see a URL again the learner rotates, which breaks the old
  subscription. There is no "feed enabled" setting: the feed row is the switch.
- The feed is `text/calendar` with `Cache-Control: private, max-age=3600`: one
  VEVENT per planned session (UTC times, UIDs stable per day and slot so updates
  replace events), a VALARM `reminder_minutes` before each when set, and problem
  titles, reasons and links. No email, username or account id.
- Before the first plan upload it is a valid empty calendar, so subscribing first
  works. Unknown and revoked tokens are `404`.
- Calendar apps refresh subscriptions on their own schedule, typically: Apple
  Calendar at the interval the subscriber picks in its settings, Outlook every
  few hours, Google within 12-24 hours with no manual refresh. `REFRESH-INTERVAL` and
  `X-PUBLISHED-TTL` ask for hourly, but Google ignores both. Google also ignores
  VALARMs in subscribed calendars and uses the calendar's own notification setting.
- No Google Calendar API or OAuth calendar scopes: those are sensitive scopes that
  need Google verification, and ICS subscription works everywhere.

### Daily email digest (designed, not built)

Not implemented; this is the shape when it is:

- Settings: `digest_email: bool` (default off) and `digest_hour: 0-23` local.
- A cron trigger (`[triggers] crons = ["0 * * * *"]`) runs hourly. It selects users
  with the digest on whose local hour (from the plan's `tz`) is `digest_hour` and
  whose stored plan has sessions today, renders today's sessions from the plan
  (same reasons as the feed, links to `/p/<id>`), and sends one Resend email each.
  The query reads `plans` and `user_settings` only; nothing is written except a
  `last_digest_day` column so a retried cron never double-sends.
- Resend's free tier is 3,000 emails a month and 100 a day, shared with magic-link
  sign-in email. That caps the digest at well under 100 daily users; beyond that it
  needs the paid tier or a per-day budget that skips the digest before sign-in mail
  is starved. Phone and desktop reminders already come free through the feed's
  VALARMs.

## Free-tier limits

- **D1 writes (100,000 rows a day).** A sync writes one row; a plan upload writes
  one row and an unchanged plan none. Feed reads write nothing. Sign-in writes one
  session row, plus a user and identity row the first time. Settings and profile
  writes skip unchanged rows. Expired sessions are swept at sign-in and expired
  magic links when a new one is requested, so no cron job is needed.
- **KV writes (1,000 a day).** Each newly cached statement is one write and each
  magic-link request is two (the rate-limit counters). Cached statements are read,
  not written.
- **CPU (10 ms per request).** No password hashing; tokens are SHA-256. The largest
  cost is validating a large progress upload.

[workers-rs]: https://github.com/cloudflare/workers-rs
[`worker-build`]: https://crates.io/crates/worker-build
