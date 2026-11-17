//! Sessions and cookies. The cookie holds a random token; D1 stores only its SHA-256,
//! so a leaked database cannot be replayed as live sessions, and any session can be
//! listed and revoked.

use sha2::{Digest, Sha256};

pub const SESSION_COOKIE: &str = "__Host-myleet_session";
pub const STATE_COOKIE: &str = "__Host-myleet_oauth_state";
/// Connecting a calendar has its own state, so it never clobbers a sign-in in flight.
pub const CAL_STATE_COOKIE: &str = "__Host-myleet_cal_state";
pub const SESSION_TTL_SECS: u64 = 30 * 86_400;
pub const STATE_TTL_SECS: u64 = 600;
/// Session and magic-link tokens are this many random bytes, sent as hex.
pub const TOKEN_BYTES: usize = 32;
const MAX_USER_AGENT_CHARS: usize = 200;

pub fn sha256_hex(data: &[u8]) -> String {
    hex(&Sha256::digest(data))
}

/// The D1 key for a session or magic-link token.
pub fn token_hash(token: &str) -> String {
    sha256_hex(token.as_bytes())
}

/// True for a token we could have issued: exactly TOKEN_BYTES of lowercase hex.
pub fn valid_token(token: &str) -> bool {
    valid_hex_id(token, TOKEN_BYTES)
}

/// True for lowercase hex encoding exactly `bytes` bytes (ids, hashes, tokens).
pub fn valid_hex_id(s: &str, bytes: usize) -> bool {
    s.len() == bytes * 2 && s.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'))
}

/// The value of cookie `name` in a `Cookie` request header.
pub fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header.split(';').find_map(|pair| {
        let (k, v) = pair.trim().split_once('=')?;
        (k == name).then_some(v)
    })
}

/// `__Host-` cookies must be Secure, Path=/ and have no Domain; browsers treat
/// http://localhost as secure, so local dev still works.
pub fn set_cookie(name: &str, value: &str, max_age_secs: u64) -> String {
    format!("{name}={value}; Path=/; Max-Age={max_age_secs}; HttpOnly; Secure; SameSite=Lax")
}

pub fn clear_cookie(name: &str) -> String {
    set_cookie(name, "", 0)
}

/// CSRF guard for state changes, on top of SameSite=Lax. Browsers send Origin on
/// every POST/PUT/PATCH/DELETE; a missing one means a non-browser client, which
/// has no ambient cookie to abuse.
pub fn origin_allowed(origin: Option<&str>, site: &str) -> bool {
    origin.is_none_or(|o| o == site)
}

/// Shown on the sessions page; trimmed so one header cannot bloat a row.
pub fn short_user_agent(ua: Option<&str>) -> Option<String> {
    let ua = ua?.trim();
    (!ua.is_empty()).then(|| ua.chars().take(MAX_USER_AGENT_CHARS).collect())
}

pub fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(DIGITS[usize::from(b >> 4)] as char);
        out.push(DIGITS[usize::from(b & 0x0f)] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_hashing() {
        let token = "ab".repeat(TOKEN_BYTES);
        assert!(valid_token(&token));
        let hash = token_hash(&token);
        assert!(valid_hex_id(&hash, 32));
        assert_ne!(hash, token);
        assert_eq!(hash, token_hash(&token));
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn token_shape() {
        for bad in [
            "",
            "abc",
            &"AB".repeat(TOKEN_BYTES),
            &"zz".repeat(TOKEN_BYTES),
            &"a".repeat(65),
        ] {
            assert!(!valid_token(bad), "{bad:?}");
        }
    }

    #[test]
    fn cookie_parsing() {
        let header = "a=1; __Host-myleet_session=v1.2.3.ab; b=x=y";
        assert_eq!(cookie_value(header, SESSION_COOKIE), Some("v1.2.3.ab"));
        assert_eq!(cookie_value(header, "b"), Some("x=y"));
        assert_eq!(cookie_value(header, "missing"), None);
        assert_eq!(cookie_value("", SESSION_COOKIE), None);
    }

    #[test]
    fn cookie_attributes() {
        let c = set_cookie(SESSION_COOKIE, "tok", 60);
        assert_eq!(
            c,
            "__Host-myleet_session=tok; Path=/; Max-Age=60; HttpOnly; Secure; SameSite=Lax"
        );
        assert!(clear_cookie(STATE_COOKIE).contains("Max-Age=0"));
    }

    #[test]
    fn origin_check() {
        let site = "https://myleet.example";
        assert!(origin_allowed(None, site));
        assert!(origin_allowed(Some(site), site));
        assert!(!origin_allowed(Some("https://evil.example"), site));
        assert!(!origin_allowed(Some("https://myleet.example.evil"), site));
        assert!(!origin_allowed(Some("null"), site));
    }

    #[test]
    fn user_agent_trimmed() {
        assert_eq!(short_user_agent(None), None);
        assert_eq!(short_user_agent(Some("  ")), None);
        assert_eq!(short_user_agent(Some("Firefox")), Some("Firefox".into()));
        assert_eq!(
            short_user_agent(Some(&"x".repeat(500))).map(|s| s.len()),
            Some(MAX_USER_AGENT_CHARS)
        );
    }

    #[test]
    fn constant_time_eq_and_hex() {
        assert!(ct_eq(b"abc", b"abc"));
        assert!(!ct_eq(b"abc", b"abd"));
        assert!(!ct_eq(b"abc", b"ab"));
        assert_eq!(hex(&[0x00, 0xab, 0xff]), "00abff");
    }
}
