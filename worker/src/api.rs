//! Workers runtime glue: routing, KV, D1 and outbound fetches. Decisions live in
//! the plain modules so they are unit tested natively.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use worker::wasm_bindgen::JsValue;
use worker::{
    Context, D1Database, D1PreparedStatement, Date, Env, Fetch, Headers, Method, Request,
    RequestInit, Response, Result, console_error, console_warn, event,
};

use crate::account::{self, MePatch, PublicSummary, Resolution, Settings, SettingsRow};
use crate::calendar;
use crate::magic;
use crate::oauth::{self, Failure, Profile, Provider};
use crate::session::{self, SESSION_COOKIE, STATE_COOKIE};
use crate::statement::{self, Cached};
use crate::sync::{self, Write};

const STATEMENT_KEY_PREFIX: &str = "stmt:v1:";
const USER_AGENT: &str = "myleet (personal study tool)";
const USER_ID_BYTES: usize = 16;
const SMALL_BODY_BYTES: usize = 16 * 1024;
/// Settings carry plan overrides (moves, one-day budgets) on top of the profile.
const ME_BODY_BYTES: usize = 64 * 1024;
const PUBLIC_PROFILE_MAX_AGE: &str = "public, max-age=300";

struct App {
    env: Env,
    site: String,
}

impl App {
    fn db(&self) -> Result<D1Database> {
        self.env.d1("DB")
    }

    fn var(&self, name: &str) -> Result<String> {
        Ok(self.env.var(name)?.to_string())
    }

    fn secret(&self, name: &str) -> Result<String> {
        Ok(self.env.secret(name)?.to_string())
    }
}

#[event(fetch)]
async fn fetch(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let site = env.var("SITE_ORIGIN")?.to_string();
    let app = App { env, site };
    let origin = req.headers().get("Origin")?;
    let res = if req.method() == Method::Options {
        Response::empty().map(|r| r.with_status(204))
    } else {
        route(&mut req, &app, origin.as_deref()).await
    };
    let mut res = match res {
        Ok(res) => res,
        Err(e) => {
            console_error!("{} {}: {e}", req.method(), req.path());
            json_error("internal error", 500)?
        }
    };
    if origin.as_deref() == Some(app.site.as_str()) {
        cors(res.headers_mut(), &app.site)?;
    }
    Ok(res)
}

async fn route(req: &mut Request, app: &App, origin: Option<&str>) -> Result<Response> {
    let method = req.method();
    let mutating = matches!(
        method,
        Method::Post | Method::Put | Method::Patch | Method::Delete
    );
    if mutating && !session::origin_allowed(origin, &app.site) {
        return json_error("cross-site request refused", 403);
    }
    let path = req.path();
    if let Some(id) = path.strip_prefix("/api/sessions/") {
        return match method {
            Method::Delete => delete_session(req, app, id).await,
            _ => json_error("method not allowed", 405),
        };
    }
    if let Some(rest) = path.strip_prefix(calendar::FEED_PREFIX) {
        return match (method, rest) {
            (Method::Post, "token") => create_feed(req, app).await,
            (Method::Delete, "token") => delete_feed(req, app).await,
            (Method::Get | Method::Head, _) => serve_feed(app, rest).await,
            _ => json_error("method not allowed", 405),
        };
    }
    if let Some(username) = path.strip_prefix("/api/u/") {
        return match method {
            Method::Get => public_profile(app, username).await,
            _ => json_error("method not allowed", 405),
        };
    }
    match (method, path.as_str()) {
        (Method::Get, "/api/statement") => get_statement(req, app).await,
        (Method::Get, "/api/auth/github") => auth_start(app, Provider::Github),
        (Method::Get, "/api/auth/google") => auth_start(app, Provider::Google),
        (Method::Get, "/api/auth/github/callback") => {
            auth_callback(req, app, Provider::Github).await
        }
        (Method::Get, "/api/auth/google/callback") => {
            auth_callback(req, app, Provider::Google).await
        }
        (Method::Post, "/api/auth/email") => email_request(req, app).await,
        (Method::Get, "/api/auth/email/verify") => email_verify(req, app).await,
        (Method::Post, "/api/auth/logout") => logout(req, app).await,
        (Method::Get, "/api/me") => get_me(req, app).await,
        (Method::Patch, "/api/me") => patch_me(req, app).await,
        (Method::Delete, "/api/me") => delete_me(req, app).await,
        (Method::Get, "/api/me/export") => export_me(req, app).await,
        (Method::Get, "/api/sessions") => list_sessions(req, app).await,
        (Method::Get, "/api/progress") => get_progress(req, app).await,
        (Method::Put, "/api/progress") => put_progress(req, app).await,
        (Method::Get, "/api/plan") => get_plan(req, app).await,
        (Method::Put, "/api/plan") => put_plan(req, app).await,
        (Method::Get, "/api/calendar") => feed_status(req, app).await,
        _ => json_error("not found", 404),
    }
}

fn cors(headers: &mut Headers, site: &str) -> Result<()> {
    headers.set("Access-Control-Allow-Origin", site)?;
    headers.set("Access-Control-Allow-Credentials", "true")?;
    headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE",
    )?;
    headers.set("Access-Control-Allow-Headers", "Content-Type")?;
    headers.set("Access-Control-Max-Age", "86400")?;
    headers.append("Vary", "Origin")
}

fn json<T: Serialize>(value: &T, status: u16) -> Result<Response> {
    let mut res = Response::from_json(value)?.with_status(status);
    res.headers_mut().set("Cache-Control", "no-store")?;
    Ok(res)
}

fn json_error(message: &str, status: u16) -> Result<Response> {
    json(&serde_json::json!({ "error": message }), status)
}

fn no_content(cookies: &[String]) -> Result<Response> {
    let headers = Headers::new();
    headers.set("Cache-Control", "no-store")?;
    for c in cookies {
        headers.append("Set-Cookie", c)?;
    }
    Ok(Response::empty()?.with_status(204).with_headers(headers))
}

fn redirect(location: &str, cookies: &[String]) -> Result<Response> {
    let headers = Headers::new();
    headers.set("Location", location)?;
    headers.set("Cache-Control", "no-store")?;
    for c in cookies {
        headers.append("Set-Cookie", c)?;
    }
    Ok(Response::empty()?.with_status(302).with_headers(headers))
}

fn now_ms() -> u64 {
    Date::now().as_millis()
}

fn num(n: u64) -> JsValue {
    JsValue::from_f64(n as f64)
}

fn text(s: &str) -> JsValue {
    JsValue::from_str(s)
}

fn opt_text(s: Option<&str>) -> JsValue {
    s.map_or(JsValue::NULL, JsValue::from_str)
}

fn random_hex(bytes: usize) -> Result<String> {
    let mut buf = vec![0u8; bytes];
    getrandom::fill(&mut buf).map_err(|e| worker::Error::RustError(e.to_string()))?;
    Ok(session::hex(&buf))
}

fn query_param(req: &Request, name: &str) -> Result<Option<String>> {
    Ok(req
        .url()?
        .query_pairs()
        .find(|(k, _)| k == name)
        .map(|(_, v)| v.into_owned()))
}

fn cookie(req: &Request, name: &str) -> Result<Option<String>> {
    let header = req.headers().get("Cookie")?.unwrap_or_default();
    Ok(session::cookie_value(&header, name).map(str::to_string))
}

/// Reads at most `max` bytes of JSON. `Err(Response)` is the 4xx to send back.
async fn read_json<T: DeserializeOwned>(
    req: &mut Request,
    max: usize,
) -> Result<std::result::Result<T, Response>> {
    let declared = req
        .headers()
        .get("Content-Length")?
        .and_then(|n| n.parse::<usize>().ok());
    if declared.is_some_and(|n| n > max) {
        return Ok(Err(json_error("body too large", 413)?));
    }
    let body = req.bytes().await?;
    if body.len() > max {
        return Ok(Err(json_error("body too large", 413)?));
    }
    match serde_json::from_slice(&body) {
        Ok(value) => Ok(Ok(value)),
        Err(e) => Ok(Err(json_error(&format!("invalid body: {e}"), 400)?)),
    }
}

async fn send(url: &str, method: Method, headers: Headers, body: Option<String>) -> Result<String> {
    let mut init = RequestInit::new();
    init.with_method(method)
        .with_headers(headers)
        .with_body(body.map(|b| JsValue::from_str(&b)));
    let mut res = Fetch::Request(Request::new_with_init(url, &init)?)
        .send()
        .await?;
    let status = res.status_code();
    if !(200..300).contains(&status) {
        return Err(worker::Error::RustError(format!("{url} returned {status}")));
    }
    res.text().await
}

// ---- statements ----

#[derive(Serialize)]
struct StatementReply<'a> {
    status: &'a str,
    markdown: &'a str,
}

fn statement_reply(status: &str, markdown: &str) -> Result<Response> {
    let mut res = json(&StatementReply { status, markdown }, 200)?;
    if status != statement::OFFLINE {
        // Same answer for everyone, so the browser and Cloudflare edge may reuse it.
        res.headers_mut()
            .set("Cache-Control", "public, max-age=86400")?;
    }
    Ok(res)
}

async fn get_statement(req: &Request, app: &App) -> Result<Response> {
    let Some(slug) = query_param(req, "slug")?.filter(|s| statement::valid_slug(s)) else {
        return json_error("slug must be a LeetCode problem slug", 400);
    };
    let kv = app.env.kv("STATEMENTS")?;
    let key = format!("{STATEMENT_KEY_PREFIX}{slug}");
    let hit = kv
        .get(&key)
        .text()
        .await?
        .and_then(|text| serde_json::from_str::<Cached>(&text).ok());
    if let Some(cached) = hit {
        return statement_reply(cached.status(true), &cached.markdown);
    }

    let headers = Headers::new();
    headers.set("Content-Type", "application/json")?;
    headers.set("Referer", &format!("https://leetcode.com/problems/{slug}/"))?;
    headers.set("User-Agent", USER_AGENT)?;
    let body = Some(statement::request_body(&slug));
    let fetched = match send(statement::ENDPOINT, Method::Post, headers, body).await {
        Ok(text) => statement::parse_reply(&text),
        Err(e) => Err(e.to_string()),
    };
    let cached = match fetched {
        Ok(cached) => cached,
        Err(e) => {
            console_warn!("statement {slug}: {e}");
            return statement_reply(statement::OFFLINE, "");
        }
    };
    let stored = kv
        .put(&key, serde_json::to_string(&cached)?)?
        .expiration_ttl(cached.ttl_secs())
        .execute()
        .await;
    if let Err(e) = stored {
        console_warn!("statement {slug}: cache write failed: {e}");
    }
    statement_reply(cached.status(false), &cached.markdown)
}

// ---- sign-in ----

fn auth_failed(app: &App, f: Failure) -> Result<Response> {
    redirect(
        &format!("{}/?auth_error={}", app.site, f.as_str()),
        &[session::clear_cookie(STATE_COOKIE)],
    )
}

fn client_id(app: &App, provider: Provider) -> Result<String> {
    app.var(match provider {
        Provider::Github => "GITHUB_CLIENT_ID",
        Provider::Google => "GOOGLE_CLIENT_ID",
    })
}

fn auth_start(app: &App, provider: Provider) -> Result<Response> {
    let state = random_hex(oauth::STATE_BYTES)?;
    let url = provider.authorize_url(
        &client_id(app, provider)?,
        &provider.redirect_uri(&app.site),
        &state,
    );
    redirect(
        &url,
        &[session::set_cookie(
            STATE_COOKIE,
            &state,
            session::STATE_TTL_SECS,
        )],
    )
}

async fn auth_callback(req: &Request, app: &App, provider: Provider) -> Result<Response> {
    let code = query_param(req, "code")?;
    let state = query_param(req, "state")?;
    let error = query_param(req, "error")?;
    let state_cookie = cookie(req, STATE_COOKIE)?;
    let code = match oauth::check_callback(
        code.as_deref(),
        state.as_deref(),
        error.as_deref(),
        state_cookie.as_deref(),
    ) {
        Ok(code) => code.to_string(),
        Err(f) => return auth_failed(app, f),
    };
    let profile = match provider_profile(app, provider, &code).await {
        Ok(Ok(profile)) => profile,
        Ok(Err(e)) => {
            console_warn!("{} sign-in: {e}", provider.as_str());
            return auth_failed(app, Failure::Email);
        }
        Err(e) => {
            console_warn!("{} sign-in: {e}", provider.as_str());
            return auth_failed(app, Failure::Upstream);
        }
    };
    finish_sign_in(req, app, &profile).await
}

fn bearer_headers(token: &str, accept: &str) -> Result<Headers> {
    let headers = Headers::new();
    headers.set("Accept", accept)?;
    headers.set("Authorization", &format!("Bearer {token}"))?;
    headers.set("User-Agent", USER_AGENT)?;
    Ok(headers)
}

/// Outer `Err` is a transport failure; inner `Err` means no verified email.
async fn provider_profile(
    app: &App,
    provider: Provider,
    code: &str,
) -> Result<std::result::Result<Profile, String>> {
    let secret = app.secret(match provider {
        Provider::Github => "GITHUB_CLIENT_SECRET",
        Provider::Google => "GOOGLE_CLIENT_SECRET",
    })?;
    let (content_type, body) = provider.token_request(
        &client_id(app, provider)?,
        &secret,
        code,
        &provider.redirect_uri(&app.site),
    );
    let headers = Headers::new();
    headers.set("Accept", "application/json")?;
    headers.set("Content-Type", content_type)?;
    headers.set("User-Agent", USER_AGENT)?;
    let reply = send(provider.token_url(), Method::Post, headers, Some(body)).await?;
    let token = oauth::parse_token_reply(&reply).map_err(worker::Error::RustError)?;
    Ok(match provider {
        Provider::Github => {
            let accept = "application/vnd.github+json";
            let user = send(
                oauth::GITHUB_USER_URL,
                Method::Get,
                bearer_headers(&token, accept)?,
                None,
            )
            .await?;
            let emails = send(
                oauth::GITHUB_EMAILS_URL,
                Method::Get,
                bearer_headers(&token, accept)?,
                None,
            )
            .await?;
            oauth::github_profile(&user, &emails)
        }
        Provider::Google => {
            let info = send(
                oauth::GOOGLE_USERINFO_URL,
                Method::Get,
                bearer_headers(&token, "application/json")?,
                None,
            )
            .await?;
            oauth::google_profile(&info)
        }
    })
}

#[derive(Deserialize)]
struct IdRow {
    id: String,
}

#[derive(Deserialize)]
struct UserIdRow {
    user_id: String,
}

/// Links or creates the account, opens a session and redirects home. Every write
/// goes in one D1 batch, which runs as a transaction.
async fn finish_sign_in(req: &Request, app: &App, p: &Profile) -> Result<Response> {
    let db = app.db()?;
    let identity: Option<UserIdRow> = db
        .prepare("SELECT user_id FROM identities WHERE provider = ?1 AND provider_user_id = ?2")
        .bind(&[text(p.provider), text(&p.provider_user_id)])?
        .first(None)
        .await?;
    let by_email: Option<IdRow> = db
        .prepare("SELECT id FROM users WHERE email = ?1")
        .bind(&[text(&p.email)])?
        .first(None)
        .await?;
    let now = now_ms();
    let mut writes = Vec::new();
    let user_id = match account::resolve(identity.map(|r| r.user_id), by_email.map(|r| r.id)) {
        Resolution::Existing(id) => id,
        Resolution::Link(id) => {
            writes.push(insert_identity(&db, p, &id, now)?);
            id
        }
        Resolution::Create => {
            let id = random_hex(USER_ID_BYTES)?;
            let suffix = random_hex(2)?;
            let mut username = account::username_from_hint(&p.username_hint, &suffix);
            if username_taken(&db, &username).await? {
                username = account::with_suffix(&username, &suffix);
            }
            writes.push(
                db.prepare(
                    "INSERT INTO users (id, email, username, display_name, avatar_url, created_at) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                )
                .bind(&[
                    text(&id),
                    text(&p.email),
                    text(&username),
                    opt_text(p.display_name.as_deref()),
                    opt_text(p.avatar_url.as_deref()),
                    num(now),
                ])?,
            );
            writes.push(insert_identity(&db, p, &id, now)?);
            id
        }
    };
    let token = random_hex(session::TOKEN_BYTES)?;
    let ua = session::short_user_agent(req.headers().get("User-Agent")?.as_deref());
    // Expired sessions are swept here so the table never needs a cron job.
    writes.push(
        db.prepare("DELETE FROM sessions WHERE user_id = ?1 AND expires_at <= ?2")
            .bind(&[text(&user_id), num(now)])?,
    );
    writes.push(
        db.prepare(
            "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) \
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .bind(&[
            text(&session::token_hash(&token)),
            text(&user_id),
            num(now),
            num(now + session::SESSION_TTL_SECS * 1000),
            opt_text(ua.as_deref()),
        ])?,
    );
    db.batch(writes).await?;
    redirect(
        &format!("{}/", app.site),
        &[
            session::clear_cookie(STATE_COOKIE),
            session::set_cookie(SESSION_COOKIE, &token, session::SESSION_TTL_SECS),
        ],
    )
}

fn insert_identity(
    db: &D1Database,
    p: &Profile,
    user_id: &str,
    now: u64,
) -> Result<D1PreparedStatement> {
    db.prepare(
        "INSERT INTO identities (provider, provider_user_id, user_id, created_at) \
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&[
        text(p.provider),
        text(&p.provider_user_id),
        text(user_id),
        num(now),
    ])
}

async fn username_taken(db: &D1Database, username: &str) -> Result<bool> {
    let row: Option<IdRow> = db
        .prepare("SELECT id FROM users WHERE username = ?1")
        .bind(&[text(username)])?
        .first(None)
        .await?;
    Ok(row.is_some())
}

#[derive(Deserialize)]
struct EmailRequest {
    email: String,
}

async fn email_request(req: &mut Request, app: &App) -> Result<Response> {
    let body: EmailRequest = match read_json(req, SMALL_BODY_BYTES).await? {
        Ok(b) => b,
        Err(res) => return Ok(res),
    };
    let Some(email) = account::normalize_email(&body.email) else {
        return json_error("invalid email address", 400);
    };
    let ip = req
        .headers()
        .get("CF-Connecting-IP")?
        .unwrap_or_else(|| "unknown".to_string());
    let now = now_ms();
    if !rate_limit(app, &email, &ip, now / 1000).await? {
        return json_error("too many sign-in emails; try again later", 429);
    }

    let token = random_hex(session::TOKEN_BYTES)?;
    let db = app.db()?;
    db.batch(vec![
        db.prepare("DELETE FROM magic_link_tokens WHERE expires_at <= ?1")
            .bind(&[num(now)])?,
        db.prepare(
            "INSERT INTO magic_link_tokens (token_hash, email, created_at, expires_at) \
             VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(&[
            text(&session::token_hash(&token)),
            text(&email),
            num(now),
            num(now + magic::LINK_TTL_SECS * 1000),
        ])?,
    ])
    .await?;

    let headers = Headers::new();
    headers.set(
        "Authorization",
        &format!("Bearer {}", app.secret("RESEND_API_KEY")?),
    )?;
    headers.set("Content-Type", "application/json")?;
    let body = magic::resend_body(
        &app.var("EMAIL_FROM")?,
        &email,
        &magic::link(&app.site, &token),
    );
    if let Err(e) = send(magic::RESEND_URL, Method::Post, headers, Some(body)).await {
        console_warn!("magic link email failed: {e}");
        return json_error("could not send the email; try again later", 502);
    }
    // Same answer whether or not an account exists, so this cannot probe emails.
    json(&serde_json::json!({ "sent": true }), 202)
}

/// Counts against both the address and the client IP; `false` means refuse.
async fn rate_limit(app: &App, email: &str, ip: &str, now_secs: u64) -> Result<bool> {
    let kv = app.env.kv("STATEMENTS")?;
    let limits = [
        (
            magic::rate_key("email", email, now_secs),
            magic::PER_EMAIL_LIMIT,
        ),
        (magic::rate_key("ip", ip, now_secs), magic::PER_IP_LIMIT),
    ];
    let mut next = Vec::with_capacity(limits.len());
    for (key, limit) in &limits {
        let stored = kv.get(key).text().await?;
        match magic::next_count(stored.as_deref(), *limit) {
            Some(count) => next.push((key, count)),
            None => return Ok(false),
        }
    }
    for (key, count) in next {
        kv.put(key, count.to_string())?
            .expiration_ttl(magic::RATE_WINDOW_SECS)
            .execute()
            .await?;
    }
    Ok(true)
}

#[derive(Deserialize)]
struct EmailRow {
    email: String,
}

async fn email_verify(req: &Request, app: &App) -> Result<Response> {
    let Some(token) = query_param(req, "token")?.filter(|t| session::valid_token(t)) else {
        return auth_failed(app, Failure::Link);
    };
    let now = now_ms();
    // One statement marks the link used, so a link can never sign in twice.
    let row: Option<EmailRow> = app
        .db()?
        .prepare(
            "UPDATE magic_link_tokens SET used_at = ?1 \
             WHERE token_hash = ?2 AND used_at IS NULL AND expires_at > ?1 RETURNING email",
        )
        .bind(&[num(now), text(&session::token_hash(&token))])?
        .first(None)
        .await?;
    let Some(EmailRow { email }) = row else {
        return auth_failed(app, Failure::Link);
    };
    let hint = email.split('@').next().unwrap_or_default().to_string();
    let profile = Profile {
        provider: "email",
        provider_user_id: email.clone(),
        email,
        display_name: None,
        avatar_url: None,
        username_hint: hint,
    };
    finish_sign_in(req, app, &profile).await
}

// ---- sessions ----

struct Current {
    user_id: String,
    session_id: String,
}

async fn current(req: &Request, app: &App) -> Result<Option<Current>> {
    let Some(token) = cookie(req, SESSION_COOKIE)?.filter(|t| session::valid_token(t)) else {
        return Ok(None);
    };
    let session_id = session::token_hash(&token);
    let row: Option<UserIdRow> = app
        .db()?
        .prepare("SELECT user_id FROM sessions WHERE id = ?1 AND expires_at > ?2")
        .bind(&[text(&session_id), num(now_ms())])?
        .first(None)
        .await?;
    Ok(row.map(|r| Current {
        user_id: r.user_id,
        session_id,
    }))
}

macro_rules! signed_in {
    ($req:expr, $app:expr) => {
        match current($req, $app).await? {
            Some(c) => c,
            None => return json_error("not signed in", 401),
        }
    };
}

async fn logout(req: &Request, app: &App) -> Result<Response> {
    if let Some(c) = current(req, app).await? {
        app.db()?
            .prepare("DELETE FROM sessions WHERE id = ?1")
            .bind(&[text(&c.session_id)])?
            .run()
            .await?;
    }
    no_content(&[session::clear_cookie(SESSION_COOKIE)])
}

#[derive(Serialize, Deserialize)]
struct SessionRow {
    id: String,
    created_at: u64,
    expires_at: u64,
    user_agent: Option<String>,
}

async fn sessions_of(app: &App, c: &Current) -> Result<Vec<serde_json::Value>> {
    let rows: Vec<SessionRow> = app
        .db()?
        .prepare(
            "SELECT id, created_at, expires_at, user_agent FROM sessions \
             WHERE user_id = ?1 AND expires_at > ?2 ORDER BY created_at DESC",
        )
        .bind(&[text(&c.user_id), num(now_ms())])?
        .all()
        .await?
        .results()?;
    Ok(rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "created_at": r.created_at,
                "expires_at": r.expires_at,
                "user_agent": r.user_agent,
                "current": r.id == c.session_id,
            })
        })
        .collect())
}

async fn list_sessions(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    json(
        &serde_json::json!({ "sessions": sessions_of(app, &c).await? }),
        200,
    )
}

async fn delete_session(req: &Request, app: &App, id: &str) -> Result<Response> {
    let c = signed_in!(req, app);
    if !session::valid_hex_id(id, 32) {
        return json_error("not found", 404);
    }
    let changes = app
        .db()?
        .prepare("DELETE FROM sessions WHERE id = ?1 AND user_id = ?2")
        .bind(&[text(id), text(&c.user_id)])?
        .run()
        .await?
        .meta()?
        .and_then(|m| m.changes)
        .unwrap_or(0);
    if changes == 0 {
        return json_error("not found", 404);
    }
    let cookies = if id == c.session_id {
        vec![session::clear_cookie(SESSION_COOKIE)]
    } else {
        Vec::new()
    };
    no_content(&cookies)
}

// ---- account ----

#[derive(Serialize, Deserialize)]
struct UserRow {
    id: String,
    email: String,
    username: String,
    display_name: Option<String>,
    avatar_url: Option<String>,
    created_at: u64,
}

#[derive(Serialize, Deserialize)]
struct IdentityRow {
    provider: String,
    created_at: u64,
}

async fn load_user(db: &D1Database, user_id: &str) -> Result<Option<UserRow>> {
    db.prepare(
        "SELECT id, email, username, display_name, avatar_url, created_at FROM users WHERE id = ?1",
    )
    .bind(&[text(user_id)])?
    .first(None)
    .await
}

async fn load_settings(db: &D1Database, user_id: &str) -> Result<Settings> {
    let row: Option<SettingsRow> = db
        .prepare(
            "SELECT theme, editor_keymap, editor_font_size, new_per_day, interview_date, \
             target_companies, reminders, public_profile, daily_minutes, session_minutes, \
             availability, days_off, reminder_minutes, extra FROM user_settings WHERE user_id = ?1",
        )
        .bind(&[text(user_id)])?
        .first(None)
        .await?;
    Ok(row.map(SettingsRow::into_settings).unwrap_or_default())
}

async fn load_identities(db: &D1Database, user_id: &str) -> Result<Vec<IdentityRow>> {
    db.prepare("SELECT provider, created_at FROM identities WHERE user_id = ?1 ORDER BY created_at")
        .bind(&[text(user_id)])?
        .all()
        .await?
        .results()
}

async fn me_body(db: &D1Database, user_id: &str) -> Result<Option<serde_json::Value>> {
    let Some(user) = load_user(db, user_id).await? else {
        return Ok(None);
    };
    let providers: Vec<String> = load_identities(db, user_id)
        .await?
        .into_iter()
        .map(|i| i.provider)
        .collect();
    let settings = load_settings(db, user_id).await?;
    Ok(Some(serde_json::json!({
        "user": user,
        "providers": providers,
        "settings": settings,
    })))
}

async fn get_me(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    match me_body(&app.db()?, &c.user_id).await? {
        Some(body) => json(&body, 200),
        None => json_error("not signed in", 401),
    }
}

fn settings_upsert(
    db: &D1Database,
    user_id: &str,
    s: &Settings,
    now: u64,
) -> Result<D1PreparedStatement> {
    db.prepare(
        "INSERT INTO user_settings (user_id, theme, editor_keymap, editor_font_size, new_per_day, \
           interview_date, target_companies, reminders, public_profile, updated_at, \
           daily_minutes, session_minutes, availability, days_off, reminder_minutes, extra) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16) \
         ON CONFLICT (user_id) DO UPDATE SET theme = excluded.theme, \
           editor_keymap = excluded.editor_keymap, editor_font_size = excluded.editor_font_size, \
           new_per_day = excluded.new_per_day, interview_date = excluded.interview_date, \
           target_companies = excluded.target_companies, reminders = excluded.reminders, \
           public_profile = excluded.public_profile, updated_at = excluded.updated_at, \
           daily_minutes = excluded.daily_minutes, session_minutes = excluded.session_minutes, \
           availability = excluded.availability, days_off = excluded.days_off, \
           reminder_minutes = excluded.reminder_minutes, extra = excluded.extra",
    )
    .bind(&[
        text(user_id),
        text(s.theme.as_str()),
        text(s.editor_keymap.as_str()),
        num(u64::from(s.editor_font_size)),
        num(u64::from(s.new_per_day)),
        opt_text(s.interview_date.as_deref()),
        text(&serde_json::to_string(&s.target_companies)?),
        num(u64::from(s.reminders)),
        num(u64::from(s.public_profile)),
        num(now),
        num(u64::from(s.daily_minutes)),
        num(u64::from(s.session_minutes)),
        text(&serde_json::to_string(&s.availability)?),
        text(&serde_json::to_string(&s.days_off)?),
        s.reminder_minutes
            .map_or(JsValue::NULL, |m| num(u64::from(m))),
        text(&serde_json::to_string(&s.extra)?),
    ])
}

async fn patch_me(req: &mut Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let patch: MePatch = match read_json(req, ME_BODY_BYTES).await? {
        Ok(p) => p,
        Err(res) => return Ok(res),
    };
    let db = app.db()?;
    let Some(user) = load_user(&db, &c.user_id).await? else {
        return json_error("not signed in", 401);
    };
    let mut username = user.username.clone();
    if let Some(wanted) = patch.username {
        if let Err(e) = account::validate_username(&wanted) {
            return json_error(&e, 400);
        }
        if wanted != user.username && username_taken(&db, &wanted).await? {
            return json_error("that username is taken", 409);
        }
        username = wanted;
    }
    let mut display_name = user.display_name.clone();
    if let Some(wanted) = patch.display_name {
        display_name = match wanted.map(|n| account::validate_display_name(&n)) {
            None => None,
            Some(Ok(n)) if n.is_empty() => None,
            Some(Ok(n)) => Some(n),
            Some(Err(e)) => return json_error(&e, 400),
        };
    }
    let current_settings = load_settings(&db, &c.user_id).await?;
    let settings = match patch.settings {
        Some(p) => match current_settings.apply(p) {
            Ok(s) => s,
            Err(e) => return json_error(&e, 400),
        },
        None => current_settings.clone(),
    };

    // Only changed rows are written: D1's free tier counts row writes.
    let mut writes = Vec::new();
    if username != user.username || display_name != user.display_name {
        writes.push(
            db.prepare("UPDATE users SET username = ?2, display_name = ?3 WHERE id = ?1")
                .bind(&[
                    text(&c.user_id),
                    text(&username),
                    opt_text(display_name.as_deref()),
                ])?,
        );
    }
    if settings != current_settings {
        writes.push(settings_upsert(&db, &c.user_id, &settings, now_ms())?);
    }
    if !writes.is_empty()
        && let Err(e) = db.batch(writes).await
    {
        // Lost a race for the username between the check and the write.
        if e.to_string().contains("UNIQUE") {
            return json_error("that username is taken", 409);
        }
        return Err(e);
    }
    match me_body(&db, &c.user_id).await? {
        Some(body) => json(&body, 200),
        None => json_error("not signed in", 401),
    }
}

async fn delete_me(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let db = app.db()?;
    let Some(user) = load_user(&db, &c.user_id).await? else {
        return json_error("not signed in", 401);
    };
    let uid = text(&c.user_id);
    let by_user = |table: &str, column: &str| {
        db.prepare(format!("DELETE FROM {table} WHERE {column} = ?1"))
            .bind(std::slice::from_ref(&uid))
    };
    db.batch(vec![
        by_user("calendar_feeds", "user_id")?,
        by_user("plans", "user_id")?,
        by_user("progress", "user_id")?,
        by_user("user_settings", "user_id")?,
        by_user("sessions", "user_id")?,
        by_user("identities", "user_id")?,
        db.prepare("DELETE FROM magic_link_tokens WHERE email = ?1")
            .bind(&[text(&user.email)])?,
        by_user("users", "id")?,
    ])
    .await?;
    no_content(&[session::clear_cookie(SESSION_COOKIE)])
}

async fn export_me(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let db = app.db()?;
    let Some(user) = load_user(&db, &c.user_id).await? else {
        return json_error("not signed in", 401);
    };
    let body = serde_json::json!({
        "exported_at": now_ms(),
        "user": user,
        "identities": load_identities(&db, &c.user_id).await?,
        "settings": load_settings(&db, &c.user_id).await?,
        "sessions": sessions_of(app, &c).await?,
        "progress": load_progress(&db, &c.user_id).await?,
        "plan": load_plan(&db, &c.user_id).await?,
        "calendar_feed": load_feed(&db, &c.user_id).await?,
    });
    let mut res = json(&body, 200)?;
    res.headers_mut().set(
        "Content-Disposition",
        "attachment; filename=\"myleet-export.json\"",
    )?;
    Ok(res)
}

#[derive(Deserialize)]
struct PublicRow {
    username: String,
    display_name: Option<String>,
    avatar_url: Option<String>,
    summary_json: Option<String>,
    updated_at: Option<u64>,
}

async fn public_profile(app: &App, username: &str) -> Result<Response> {
    if account::validate_username(username).is_err() {
        return json_error("not found", 404);
    }
    // Private and missing profiles both 404, so the endpoint does not reveal accounts.
    let row: Option<PublicRow> = app
        .db()?
        .prepare(
            "SELECT u.username, u.display_name, u.avatar_url, p.summary_json, p.updated_at \
             FROM users u JOIN user_settings s ON s.user_id = u.id \
             LEFT JOIN progress p ON p.user_id = u.id \
             WHERE u.username = ?1 AND s.public_profile = 1",
        )
        .bind(&[text(username)])?
        .first(None)
        .await?;
    let Some(row) = row else {
        return json_error("not found", 404);
    };
    let summary: Option<PublicSummary> = row
        .summary_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());
    let mut res = json(
        &serde_json::json!({
            "username": row.username,
            "display_name": row.display_name,
            "avatar_url": row.avatar_url,
            "summary": summary,
            "updated_at": row.updated_at,
        }),
        200,
    )?;
    res.headers_mut()
        .set("Cache-Control", PUBLIC_PROFILE_MAX_AGE)?;
    Ok(res)
}

// ---- progress ----

#[derive(Serialize, Deserialize)]
struct ProgressRow {
    events_jsonl: String,
    version: i64,
    updated_at: u64,
    notes_json: Option<String>,
}

async fn load_progress(db: &D1Database, user_id: &str) -> Result<Option<ProgressRow>> {
    db.prepare(
        "SELECT events_jsonl, version, updated_at, notes_json FROM progress WHERE user_id = ?1",
    )
    .bind(&[text(user_id)])?
    .first(None)
    .await
}

async fn get_progress(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    match load_progress(&app.db()?, &c.user_id).await? {
        Some(row) => json(&row, 200),
        None => json(
            &serde_json::json!({"events_jsonl": "", "version": 0, "updated_at": null, "notes_json": null}),
            200,
        ),
    }
}

async fn put_progress(req: &mut Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let declared = req
        .headers()
        .get("Content-Length")?
        .and_then(|n| n.parse::<usize>().ok());
    if declared.is_some_and(|n| n > sync::MAX_BODY_BYTES) {
        return json_error(&sync::PutError::TooLarge.message(), 413);
    }
    let put = match sync::parse_put(&req.bytes().await?) {
        Ok(put) => put,
        Err(e) => return json_error(&e.message(), e.status()),
    };
    let summary = put
        .summary
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;
    let now = now_ms();
    let db = app.db()?;
    let binds = [
        text(&c.user_id),
        text(&put.events_jsonl),
        num(now),
        opt_text(summary.as_deref()),
        opt_text(put.notes_json.as_deref()),
    ];
    let statement = match sync::plan(put.base_version) {
        Write::Insert => db
            .prepare(
                "INSERT INTO progress (user_id, events_jsonl, version, updated_at, summary_json, \
                   notes_json) \
                 VALUES (?1, ?2, 1, ?3, ?4, ?5) ON CONFLICT (user_id) DO NOTHING",
            )
            .bind(&binds)?,
        Write::Update { expected } => {
            let mut binds = binds.to_vec();
            binds.push(JsValue::from_f64(expected as f64));
            db.prepare(
                "UPDATE progress SET events_jsonl = ?2, version = version + 1, updated_at = ?3, \
                   summary_json = COALESCE(?4, summary_json), notes_json = COALESCE(?5, notes_json) \
                 WHERE user_id = ?1 AND version = ?6",
            )
            .bind(&binds)?
        }
    };
    let changes = statement
        .run()
        .await?
        .meta()?
        .and_then(|m| m.changes)
        .unwrap_or(0);
    match sync::outcome(put.base_version, changes) {
        Some(version) => json(
            &serde_json::json!({"version": version, "updated_at": now}),
            200,
        ),
        None => json(
            &serde_json::json!({
                "error": "stale base_version: merge with current and retry",
                "current": load_progress(&db, &c.user_id).await?,
            }),
            409,
        ),
    }
}

// ---- plan and calendar feed ----

#[derive(Serialize, Deserialize)]
struct PlanRow {
    plan_json: String,
    updated_at: u64,
}

async fn load_plan(db: &D1Database, user_id: &str) -> Result<Option<serde_json::Value>> {
    let row: Option<PlanRow> = db
        .prepare("SELECT plan_json, updated_at FROM plans WHERE user_id = ?1")
        .bind(&[text(user_id)])?
        .first(None)
        .await?;
    Ok(row.map(|r| {
        serde_json::json!({
            "plan": serde_json::from_str::<serde_json::Value>(&r.plan_json).unwrap_or_default(),
            "updated_at": r.updated_at,
        })
    }))
}

async fn get_plan(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    match load_plan(&app.db()?, &c.user_id).await? {
        Some(body) => json(&body, 200),
        None => json(&serde_json::json!({"plan": null, "updated_at": null}), 200),
    }
}

async fn put_plan(req: &mut Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let declared = req
        .headers()
        .get("Content-Length")?
        .and_then(|n| n.parse::<usize>().ok());
    if declared.is_some_and(|n| n > calendar::MAX_PLAN_BYTES) {
        return json_error("plan too large", 413);
    }
    let plan = match calendar::parse_plan(&req.bytes().await?) {
        Ok(p) => p,
        Err((status, message)) => return json_error(&message, status),
    };
    let now = now_ms();
    // The WHERE skips the write when nothing changed: D1 bills rows written.
    let changes = app
        .db()?
        .prepare(
            "INSERT INTO plans (user_id, plan_json, updated_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT (user_id) DO UPDATE SET plan_json = excluded.plan_json, \
               updated_at = excluded.updated_at WHERE plans.plan_json != excluded.plan_json",
        )
        .bind(&[
            text(&c.user_id),
            text(&serde_json::to_string(&plan)?),
            num(now),
        ])?
        .run()
        .await?
        .meta()?
        .and_then(|m| m.changes)
        .unwrap_or(0);
    json(
        &serde_json::json!({"changed": changes > 0, "updated_at": now}),
        200,
    )
}

#[derive(Serialize, Deserialize)]
struct FeedRow {
    created_at: u64,
}

async fn load_feed(db: &D1Database, user_id: &str) -> Result<Option<FeedRow>> {
    db.prepare("SELECT created_at FROM calendar_feeds WHERE user_id = ?1")
        .bind(&[text(user_id)])?
        .first(None)
        .await
}

async fn feed_status(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let db = app.db()?;
    let feed = load_feed(&db, &c.user_id).await?;
    let plan: Option<FeedRow> = db
        .prepare("SELECT updated_at AS created_at FROM plans WHERE user_id = ?1")
        .bind(&[text(&c.user_id)])?
        .first(None)
        .await?;
    json(
        &serde_json::json!({
            "enabled": feed.is_some(),
            "created_at": feed.map(|f| f.created_at),
            "plan_updated_at": plan.map(|p| p.created_at),
        }),
        200,
    )
}

/// Creates the feed, or rotates it: the old URL stops working at once.
async fn create_feed(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    let token = random_hex(session::TOKEN_BYTES)?;
    let now = now_ms();
    app.db()?
        .prepare(
            "INSERT INTO calendar_feeds (token_hash, user_id, created_at) VALUES (?1, ?2, ?3) \
             ON CONFLICT (user_id) DO UPDATE SET token_hash = excluded.token_hash, \
               created_at = excluded.created_at",
        )
        .bind(&[
            text(&session::token_hash(&token)),
            text(&c.user_id),
            num(now),
        ])?
        .run()
        .await?;
    let mut body = serde_json::to_value(calendar::links(&app.site, &token))?;
    body["created_at"] = serde_json::json!(now);
    json(&body, 201)
}

async fn delete_feed(req: &Request, app: &App) -> Result<Response> {
    let c = signed_in!(req, app);
    app.db()?
        .prepare("DELETE FROM calendar_feeds WHERE user_id = ?1")
        .bind(&[text(&c.user_id)])?
        .run()
        .await?;
    no_content(&[])
}

#[derive(Deserialize)]
struct FeedLookup {
    user_id: String,
    plan_json: Option<String>,
    settings_user: Option<String>,
    reminder_minutes: Option<u32>,
}

/// `GET /api/calendar/<token>.ics`. No cookie: calendar apps fetch it themselves.
async fn serve_feed(app: &App, rest: &str) -> Result<Response> {
    let Some(token) = calendar::feed_token(rest) else {
        return json_error("not found", 404);
    };
    let row: Option<FeedLookup> = app
        .db()?
        .prepare(
            "SELECT f.user_id, p.plan_json, s.user_id AS settings_user, s.reminder_minutes \
             FROM calendar_feeds f LEFT JOIN plans p ON p.user_id = f.user_id \
             LEFT JOIN user_settings s ON s.user_id = f.user_id WHERE f.token_hash = ?1",
        )
        .bind(&[text(&session::token_hash(token))])?
        .first(None)
        .await?;
    let Some(row) = row else {
        return json_error("not found", 404);
    };
    let plan = row.plan_json.as_deref().and_then(|j| {
        serde_json::from_str(j)
            .map_err(|e| console_warn!("stored plan unreadable: {e}"))
            .ok()
    });
    let reminder = if row.settings_user.is_some() {
        row.reminder_minutes
    } else {
        Settings::default().reminder_minutes
    };
    let ics = calendar::render(plan.as_ref(), &app.site, reminder, &row.user_id);
    let headers = Headers::new();
    headers.set("Content-Type", "text/calendar; charset=utf-8")?;
    headers.set("Cache-Control", calendar::FEED_CACHE)?;
    headers.set("Content-Disposition", "inline; filename=\"myleet.ics\"")?;
    Ok(Response::ok(ics)?.with_headers(headers))
}
