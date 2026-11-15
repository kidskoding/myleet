# myleet worker

The myleet backend: one Cloudflare Worker written in Rust ([workers-rs]). It serves
the Astro site's static files from `../web/dist`, and handles `/api/*`:

- accounts: sign in with GitHub, Google or an emailed magic link (no passwords),
  linked into one account by verified email
- sessions you can list and revoke, settings, account export and deletion
- LeetCode problem statements, fetched once and cached in KV
- progress sync: one versioned D1 row per user holding `events.jsonl`
- opt-in public profiles for shareable progress cards

It is a separate crate with its own `[workspace]`, so the root workspace does not
build it. Only `src/api.rs` uses the Workers runtime; everything else is plain Rust
with native unit tests.

[workers-rs]: https://github.com/cloudflare/workers-rs

## Layout

| Path | What it holds |
| --- | --- |
| `src/api.rs` | Routing, D1, KV and outbound fetches (wasm32 only) |
| `src/account.rs` | Email and username rules, settings, account linking, public summary |
| `src/oauth.rs` | GitHub and Google OAuth URLs, token exchange, profile parsing |
| `src/magic.rs` | Magic-link email and rate-limit counters |
| `src/session.rs` | Session tokens, cookies, CSRF origin check |
| `src/statement.rs` | LeetCode GraphQL reply to markdown, premium detection |
| `src/sync.rs` | Progress upload validation and version conflicts |
| `migrations/` | D1 schema, applied with `wrangler d1 migrations apply` |
| `wrangler.toml` | Worker config: bindings, public vars, static assets |

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

[`worker-build`]: https://crates.io/crates/worker-build

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

| Name | Kind | Purpose |
| --- | --- | --- |
| `SITE_ORIGIN` | var | Site origin: redirects, CORS, CSRF check |
| `GITHUB_CLIENT_ID` | var | GitHub OAuth app client id |
| `GOOGLE_CLIENT_ID` | var | Google OAuth client id |
| `EMAIL_FROM` | var | Sender for magic-link email |
| `GITHUB_CLIENT_SECRET` | secret | GitHub OAuth app secret |
| `GOOGLE_CLIENT_SECRET` | secret | Google OAuth client secret |
| `RESEND_API_KEY` | secret | Resend API key |
| `DB` | D1 binding | Accounts, sessions, settings, progress |
| `STATEMENTS` | KV binding | Statement cache and rate-limit counters |

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

| Endpoint | What it does |
| --- | --- |
| `GET /api/auth/github` | Redirects to GitHub (scope `user:email`) |
| `GET /api/auth/github/callback` | OAuth callback |
| `GET /api/auth/google` | Redirects to Google (scopes `openid email profile`) |
| `GET /api/auth/google/callback` | OAuth callback |
| `POST /api/auth/email` | Body `{"email": "..."}`. Sends a magic link: `202 {"sent": true}` |
| `GET /api/auth/email/verify?token=` | The link in the email. Single use, expires in 15 minutes |
| `POST /api/auth/logout` | Revokes this session and clears the cookie: `204` |

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
  "settings": {"theme": "system", "editor_keymap": "vim", "editor_font_size": 14,
               "new_per_day": 3, "interview_date": "2027-02-01",
               "target_companies": ["google"], "reminders": false, "public_profile": false}
}
```

`PATCH /api/me` takes any subset of
`{"username": "...", "display_name": "..." | null, "settings": {...}}` (settings
fields as above, each optional; `interview_date: null` clears it). It returns the same
body as `GET /api/me`. Validation:

- `username`: 3-30 characters of `a-z 0-9 - _`, starting with a letter or digit,
  not a reserved word (`admin`, `api`, `u`, ...). Taken is `409`.
- `display_name`: up to 60 characters, no control characters; `null` or empty clears.
- `theme`: `system`, `light` or `dark`. `editor_keymap`: `standard` or `vim`.
  `editor_font_size`: 10-28. `new_per_day`: 0-20. `interview_date`: `YYYY-MM-DD`.
  `target_companies`: up to 40 playlist slugs.
- Unknown fields are `400`.

`GET /api/me/export` downloads `myleet-export.json` with the profile, sign-in methods,
settings, sessions and progress.

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
{"events_jsonl": "{\"t\":...}\n...", "version": 4, "updated_at": 1794700000000}
```

Before the first sync it returns `version: 0`, empty events and `updated_at: null`.

`PUT /api/progress`

```json
{"base_version": 4, "events_jsonl": "...", "summary": {"streak": 5, "mastered": 12, "solved": 40, "heatmap": {"2026-11-14": 3}}}
```

- `base_version` is the version the client last saw (0 if it has never synced).
- `events_jsonl` replaces the stored events; each non-blank line must be a JSON
  object. At most 1,900,000 bytes (D1 caps a row at 2 MB); larger is `413`.
- `summary` is optional and powers the public profile. The client computes it
  because it owns the scheduler. Leaving it out keeps the stored summary.

Success is `200 {"version": 5, "updated_at": ...}`. If another device synced first,
the response is `409` with the stored copy, so the client can merge and retry with
the new `version`:

```json
{"error": "stale base_version: merge with current and retry",
 "current": {"events_jsonl": "...", "version": 5, "updated_at": 1794700000000}}
```

### Public profile

`GET /api/u/<username>` returns a profile only if its owner turned on
`settings.public_profile`; otherwise `404`, the same as for a missing user:

```json
{"username": "ann", "display_name": "Ann", "avatar_url": "https://...",
 "summary": {"streak": 5, "mastered": 12, "solved": 40, "heatmap": {"2026-11-14": 3}},
 "updated_at": 1794700000000}
```

## Free-tier limits

- **D1 writes (100,000 rows a day).** A sync writes one row. Sign-in writes one
  session row, plus a user and identity row the first time. Settings and profile
  writes skip unchanged rows. Expired sessions are swept at sign-in and expired
  magic links when a new one is requested, so no cron job is needed.
- **KV writes (1,000 a day).** Each newly cached statement is one write and each
  magic-link request is two (the rate-limit counters). Cached statements are read,
  not written.
- **CPU (10 ms per request).** No password hashing; tokens are SHA-256. The largest
  cost is validating a large progress upload.
