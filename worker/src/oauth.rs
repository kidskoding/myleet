//! GitHub and Google OAuth (authorization-code flow). Each provider yields a
//! verified email so accounts link across providers; provider access tokens are
//! used once and never stored.

use serde::Deserialize;

/// The OAuth `state` is this many random bytes, sent as hex.
pub const STATE_BYTES: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    Github,
    Google,
}

impl Provider {
    pub fn as_str(self) -> &'static str {
        match self {
            Provider::Github => "github",
            Provider::Google => "google",
        }
    }

    pub fn callback_path(self) -> &'static str {
        match self {
            Provider::Github => "/api/auth/github/callback",
            Provider::Google => "/api/auth/google/callback",
        }
    }

    pub fn token_url(self) -> &'static str {
        match self {
            Provider::Github => "https://github.com/login/oauth/access_token",
            Provider::Google => "https://oauth2.googleapis.com/token",
        }
    }

    pub fn redirect_uri(self, site: &str) -> String {
        format!("{site}{}", self.callback_path())
    }

    /// GitHub needs `user:email` because the profile email may be hidden or unverified.
    pub fn authorize_url(self, client_id: &str, redirect_uri: &str, state: &str) -> String {
        let (base, scope, extra) = match self {
            Provider::Github => (
                "https://github.com/login/oauth/authorize",
                "user:email",
                "&allow_signup=true",
            ),
            Provider::Google => (
                "https://accounts.google.com/o/oauth2/v2/auth",
                "openid email profile",
                "&response_type=code&prompt=select_account",
            ),
        };
        format!(
            "{base}?client_id={}&redirect_uri={}&scope={}&state={}{extra}",
            encode(client_id),
            encode(redirect_uri),
            encode(scope),
            encode(state),
        )
    }

    /// Returns (content type, body). Google only takes a form body.
    pub fn token_request(
        self,
        client_id: &str,
        client_secret: &str,
        code: &str,
        redirect_uri: &str,
    ) -> (&'static str, String) {
        match self {
            Provider::Github => (
                "application/json",
                serde_json::json!({
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                })
                .to_string(),
            ),
            Provider::Google => (
                "application/x-www-form-urlencoded",
                format!(
                    "grant_type=authorization_code&code={}&client_id={}&client_secret={}&redirect_uri={}",
                    encode(code),
                    encode(client_id),
                    encode(client_secret),
                    encode(redirect_uri),
                ),
            ),
        }
    }
}

pub const GITHUB_USER_URL: &str = "https://api.github.com/user";
pub const GITHUB_EMAILS_URL: &str = "https://api.github.com/user/emails";
pub const GOOGLE_USERINFO_URL: &str = "https://openidconnect.googleapis.com/v1/userinfo";

#[derive(Deserialize)]
struct TokenReply {
    access_token: Option<String>,
    error: Option<String>,
}

/// GitHub answers 200 even on failure, with `error` instead of a token.
pub fn parse_token_reply(text: &str) -> Result<String, String> {
    let reply: TokenReply = serde_json::from_str(text).map_err(|e| e.to_string())?;
    match (reply.access_token, reply.error) {
        (Some(token), None) if !token.is_empty() => Ok(token),
        (_, Some(err)) => Err(format!("oauth: {err}")),
        _ => Err("oauth: no access token".to_string()),
    }
}

/// What a provider tells us about the person signing in.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Profile {
    pub provider: &'static str,
    pub provider_user_id: String,
    /// Lowercased and verified by the provider.
    pub email: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    /// Seed for a new account's username.
    pub username_hint: String,
}

#[derive(Deserialize)]
struct GithubUser {
    id: i64,
    login: String,
    name: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct GithubEmail {
    email: String,
    #[serde(default)]
    primary: bool,
    #[serde(default)]
    verified: bool,
}

pub fn github_profile(user_json: &str, emails_json: &str) -> Result<Profile, String> {
    let user: GithubUser = serde_json::from_str(user_json).map_err(|e| e.to_string())?;
    if user.id <= 0 || user.login.is_empty() {
        return Err("github: malformed user".to_string());
    }
    let emails: Vec<GithubEmail> = serde_json::from_str(emails_json).map_err(|e| e.to_string())?;
    // Primary first; never an unverified address, or anyone could claim an account.
    let email = emails
        .iter()
        .filter(|e| e.verified)
        .max_by_key(|e| e.primary)
        .and_then(|e| crate::account::normalize_email(&e.email))
        .ok_or("github: no verified email")?;
    Ok(Profile {
        provider: Provider::Github.as_str(),
        provider_user_id: user.id.to_string(),
        email,
        display_name: user.name.filter(|n| !n.trim().is_empty()),
        avatar_url: user.avatar_url,
        username_hint: user.login,
    })
}

#[derive(Deserialize)]
struct GoogleUser {
    sub: String,
    email: Option<String>,
    #[serde(default)]
    email_verified: bool,
    name: Option<String>,
    picture: Option<String>,
}

pub fn google_profile(userinfo_json: &str) -> Result<Profile, String> {
    let user: GoogleUser = serde_json::from_str(userinfo_json).map_err(|e| e.to_string())?;
    if user.sub.is_empty() {
        return Err("google: malformed user".to_string());
    }
    let email = user
        .email
        .filter(|_| user.email_verified)
        .and_then(|e| crate::account::normalize_email(&e))
        .ok_or("google: no verified email")?;
    let hint = email.split('@').next().unwrap_or_default().to_string();
    Ok(Profile {
        provider: Provider::Google.as_str(),
        provider_user_id: user.sub,
        email,
        display_name: user.name.filter(|n| !n.trim().is_empty()),
        avatar_url: user.picture,
        username_hint: hint,
    })
}

/// Why sign-in failed, as the `auth_error` query value the site sees.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Failure {
    /// The user declined at the provider.
    Denied,
    /// Missing or mismatched state: a stale tab or a forged callback.
    State,
    /// The provider gave no verified email.
    Email,
    /// The provider or D1 failed.
    Upstream,
    /// A magic link that is unknown, used or expired.
    Link,
}

impl Failure {
    pub fn as_str(self) -> &'static str {
        match self {
            Failure::Denied => "denied",
            Failure::State => "state",
            Failure::Email => "email",
            Failure::Upstream => "upstream",
            Failure::Link => "link",
        }
    }
}

/// Checks the callback query against the state cookie and returns the code.
pub fn check_callback<'a>(
    code: Option<&'a str>,
    state: Option<&str>,
    error: Option<&str>,
    state_cookie: Option<&str>,
) -> Result<&'a str, Failure> {
    if error.is_some() {
        return Err(Failure::Denied);
    }
    let (Some(state), Some(cookie)) = (state, state_cookie) else {
        return Err(Failure::State);
    };
    if state.len() != STATE_BYTES * 2 || !crate::session::ct_eq(state.as_bytes(), cookie.as_bytes())
    {
        return Err(Failure::State);
    }
    code.filter(|c| !c.is_empty()).ok_or(Failure::State)
}

/// Percent-encodes a query component (RFC 3986 unreserved characters pass through).
pub fn encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Which sign-in methods `/api/auth/providers` offers. The page hides the rest.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub struct Providers {
    pub github: bool,
    pub google: bool,
    pub email: bool,
}

/// A config value counts once it is set and is not a `replace-...` or example.com
/// placeholder from `wrangler.toml`.
pub fn configured(value: Option<&str>) -> bool {
    value
        .map(str::trim)
        .is_some_and(|v| !v.is_empty() && !v.contains("replace-") && !v.contains("example.com"))
}

/// Email needs both the Resend key and a real sender address.
pub fn providers(
    github_id: Option<&str>,
    google_id: Option<&str>,
    resend_key: Option<&str>,
    email_from: Option<&str>,
) -> Providers {
    Providers {
        github: configured(github_id),
        google: configured(google_id),
        email: configured(resend_key) && configured(email_from),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn providers_skip_placeholders() {
        let p = providers(
            Some("Ov23lifOFJZIw2RR9RMi"),
            Some("replace-with-google-oauth-client-id.apps.googleusercontent.com"),
            None,
            Some("myleet <login@myleet.example.com>"),
        );
        assert_eq!(
            p,
            Providers {
                github: true,
                google: false,
                email: false
            }
        );
        let all = providers(
            Some("gh"),
            Some("123.apps.googleusercontent.com"),
            Some("re_abc"),
            Some("myleet <login@myleet.dev>"),
        );
        assert!(all.github && all.google && all.email);
        assert!(!providers(Some("gh"), None, Some("re_abc"), None).email);
        assert!(!providers(Some("  "), None, Some(""), Some("a@b.dev")).github);
        assert_eq!(
            serde_json::to_string(&all).unwrap(),
            r#"{"github":true,"google":true,"email":true}"#
        );
    }

    #[test]
    fn authorize_urls() {
        let gh = Provider::Github.authorize_url(
            "Iv1.abc",
            &Provider::Github.redirect_uri("https://myleet.example"),
            "00ff",
        );
        assert_eq!(
            gh,
            "https://github.com/login/oauth/authorize?client_id=Iv1.abc\
             &redirect_uri=https%3A%2F%2Fmyleet.example%2Fapi%2Fauth%2Fgithub%2Fcallback\
             &scope=user%3Aemail&state=00ff&allow_signup=true"
        );
        let g = Provider::Google.authorize_url("id", "https://x/cb", "s");
        assert!(g.starts_with("https://accounts.google.com/o/oauth2/v2/auth?client_id=id"));
        assert!(g.contains("scope=openid%20email%20profile"));
        assert!(g.contains("response_type=code"));
        assert_eq!(encode("a b&c=d"), "a%20b%26c%3Dd");
    }

    #[test]
    fn token_requests() {
        let (ct, body) = Provider::Google.token_request("id", "s&cret", "c/1", "https://x/cb");
        assert_eq!(ct, "application/x-www-form-urlencoded");
        assert!(body.contains("client_secret=s%26cret"));
        assert!(body.contains("code=c%2F1"));
        let (ct, body) = Provider::Github.token_request("id", "sec", "c", "https://x/cb");
        assert_eq!(ct, "application/json");
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&body).unwrap()["code"],
            "c"
        );
    }

    #[test]
    fn token_reply() {
        assert_eq!(
            parse_token_reply(r#"{"access_token":"gho_x","token_type":"bearer","scope":""}"#),
            Ok("gho_x".to_string())
        );
        assert!(
            parse_token_reply(r#"{"error":"bad_verification_code"}"#)
                .unwrap_err()
                .contains("bad_verification_code")
        );
        assert!(parse_token_reply(r#"{"access_token":""}"#).is_err());
        assert!(parse_token_reply("not json").is_err());
    }

    const GH_USER: &str =
        r#"{"id":583231,"login":"octocat","name":"The Octocat","avatar_url":"https://a/x.png"}"#;

    #[test]
    fn github_picks_primary_verified_email() {
        let emails = r#"[{"email":"old@x.com","primary":false,"verified":true},
                         {"email":"Main@X.com","primary":true,"verified":true},
                         {"email":"evil@x.com","primary":false,"verified":false}]"#;
        let p = github_profile(GH_USER, emails).unwrap();
        assert_eq!(p.email, "main@x.com");
        assert_eq!(p.provider_user_id, "583231");
        assert_eq!(p.username_hint, "octocat");
        assert_eq!(p.display_name.as_deref(), Some("The Octocat"));
    }

    #[test]
    fn github_rejects_unverified_only() {
        let emails = r#"[{"email":"a@x.com","primary":true,"verified":false}]"#;
        assert!(github_profile(GH_USER, emails).is_err());
        assert!(github_profile(r#"{"id":0,"login":"x"}"#, "[]").is_err());
    }

    #[test]
    fn google_requires_verified_email() {
        let ok = google_profile(
            r#"{"sub":"1099","email":"Ann.Lee@gmail.com","email_verified":true,"name":"Ann","picture":"https://p"}"#,
        )
        .unwrap();
        assert_eq!(ok.email, "ann.lee@gmail.com");
        assert_eq!(ok.username_hint, "ann.lee");
        assert_eq!(ok.provider, "google");
        assert!(google_profile(r#"{"sub":"1","email":"a@b.co","email_verified":false}"#).is_err());
        assert!(google_profile(r#"{"sub":"","email":"a@b.co","email_verified":true}"#).is_err());
    }

    #[test]
    fn callback_checks() {
        let s = "0123456789abcdef0123456789abcdef";
        assert_eq!(check_callback(Some("c"), Some(s), None, Some(s)), Ok("c"));
        assert_eq!(
            check_callback(None, None, Some("access_denied"), Some(s)),
            Err(Failure::Denied)
        );
        assert_eq!(
            check_callback(Some("c"), Some(s), None, None),
            Err(Failure::State)
        );
        let other = "fedcba9876543210fedcba9876543210";
        assert_eq!(
            check_callback(Some("c"), Some(other), None, Some(s)),
            Err(Failure::State)
        );
        assert_eq!(
            check_callback(Some("c"), Some(""), None, Some("")),
            Err(Failure::State)
        );
        assert_eq!(
            check_callback(Some(""), Some(s), None, Some(s)),
            Err(Failure::State)
        );
    }
}
