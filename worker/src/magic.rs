//! Email magic-link sign-in: no passwords, so no slow hashing under the 10 ms CPU
//! limit. Links are single use, expire quickly and are rate limited.

use crate::session::sha256_hex;

pub const LINK_TTL_SECS: u64 = 15 * 60;
pub const VERIFY_PATH: &str = "/api/auth/email/verify";
pub const RESEND_URL: &str = "https://api.resend.com/emails";

/// Fixed one-hour windows. KV counters are eventually consistent, so the limits are
/// approximate; they stop floods, not a determined single extra request.
pub const RATE_WINDOW_SECS: u64 = 3600;
pub const PER_EMAIL_LIMIT: u32 = 5;
pub const PER_IP_LIMIT: u32 = 20;

/// Local dev without email set up: the sign-in link is printed in the `wrangler dev`
/// terminal instead of emailed. Only for an `http://localhost` or `http://127.0.0.1`
/// site, which production's `https://` origin can never be.
pub fn print_link_instead(site: &str, email_configured: bool) -> bool {
    let local = ["http://localhost", "http://127.0.0.1"].iter().any(|h| {
        site == *h
            || site
                .strip_prefix(h)
                .is_some_and(|rest| rest.starts_with(':'))
    });
    local && !email_configured
}

pub fn link(site: &str, token: &str) -> String {
    format!("{site}{VERIFY_PATH}?token={token}")
}

/// The Resend `POST /emails` body.
pub fn resend_body(from: &str, to: &str, link: &str) -> String {
    let minutes = LINK_TTL_SECS / 60;
    let text = format!(
        "Sign in to myleet:\n\n{link}\n\nThe link works once and expires in {minutes} minutes. \
         If you did not ask for it, ignore this email."
    );
    let href = html_escape(link);
    let html = format!(
        "<p>Sign in to myleet:</p><p><a href=\"{href}\">Sign in</a></p>\
         <p>The link works once and expires in {minutes} minutes. \
         If you did not ask for it, ignore this email.</p>"
    );
    serde_json::json!({
        "from": from,
        "to": [to],
        "subject": "Your myleet sign-in link",
        "text": text,
        "html": html,
    })
    .to_string()
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// KV key for one subject's counter in the current window. Subjects are hashed so
/// KV never holds raw emails or IPs.
pub fn rate_key(scope: &str, subject: &str, now_secs: u64) -> String {
    format!(
        "rl:{scope}:{}:{}",
        sha256_hex(subject.as_bytes()),
        now_secs / RATE_WINDOW_SECS
    )
}

/// The new count to store, or `None` when the request is over the limit.
pub fn next_count(stored: Option<&str>, limit: u32) -> Option<u32> {
    let count = stored.and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
    (count < limit).then_some(count + 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_and_email() {
        let token = "ab".repeat(32);
        let link = link("https://myleet.example", &token);
        assert_eq!(
            link,
            format!("https://myleet.example/api/auth/email/verify?token={token}")
        );
        let body: serde_json::Value = serde_json::from_str(&resend_body(
            "myleet <login@myleet.example>",
            "a@b.co",
            &link,
        ))
        .unwrap();
        assert_eq!(body["to"][0], "a@b.co");
        assert!(body["text"].as_str().unwrap().contains(&link));
        assert!(body["html"].as_str().unwrap().contains(&link));
        assert_eq!(html_escape("a&b<\"c\">"), "a&amp;b&lt;&quot;c&quot;&gt;");
    }

    #[test]
    fn rate_keys_hash_subject_and_window() {
        let k = rate_key("email", "a@b.co", 7200);
        assert!(k.starts_with("rl:email:") && k.ends_with(":2"), "{k}");
        assert!(!k.contains("a@b.co"));
        assert_eq!(k, rate_key("email", "a@b.co", 7200 + 3599));
        assert_ne!(k, rate_key("email", "a@b.co", 7200 + 3600));
        assert_ne!(k, rate_key("ip", "a@b.co", 7200));
    }

    #[test]
    fn counting() {
        assert_eq!(next_count(None, 5), Some(1));
        assert_eq!(next_count(Some("4"), 5), Some(5));
        assert_eq!(next_count(Some("5"), 5), None);
        assert_eq!(next_count(Some("garbage"), 5), Some(1));
    }

    #[test]
    fn printed_links_are_local_dev_only() {
        assert!(print_link_instead("http://localhost:8787", false));
        assert!(print_link_instead("http://127.0.0.1:8787", false));
        assert!(!print_link_instead("http://localhost:8787", true));
        assert!(!print_link_instead(
            "https://myleet.anirudhkonidala.workers.dev",
            false
        ));
        assert!(!print_link_instead("https://localhost:8787", false));
        assert!(!print_link_instead("http://localhost.evil.com", false));
        assert!(!print_link_instead("http://127.0.0.10:8787", false));
    }
}
