//! Private calendar feeds: the client uploads its computed plan, and a secret URL
//! serves it as iCalendar for Google, Apple, Outlook or any calendar that subscribes
//! by URL. The token in the URL is the only credential, so it is long, random,
//! stored only as a hash, and revocable. The feed holds problem titles and links,
//! never an email or username.

use myleet_core::ical::{self, IcsOptions};
use myleet_core::planner::Plan;
use serde::Deserialize;

use crate::session;

/// A 182-day plan is about 250 KB; leave room without inviting abuse.
pub const MAX_PLAN_BYTES: usize = 1_000_000;
/// Calendar apps poll on their own schedule; an hour keeps edge and client reuse
/// cheap. `private` so no shared cache keeps a revoked feed.
pub const FEED_CACHE: &str = "private, max-age=3600";
pub const FEED_NAME: &str = "myleet plan";
pub const FEED_PREFIX: &str = "/api/calendar/";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlanBody {
    pub plan: Plan,
}

/// `PUT /api/plan` body to a plan, or the status and message to answer with.
pub fn parse_plan(body: &[u8]) -> Result<Plan, (u16, String)> {
    if body.len() > MAX_PLAN_BYTES {
        return Err((413, format!("plan is over {MAX_PLAN_BYTES} bytes")));
    }
    let b: PlanBody =
        serde_json::from_slice(body).map_err(|e| (400, format!("invalid plan: {e}")))?;
    Ok(b.plan)
}

/// The secret from `<token>.ics`, the part of the path after [`FEED_PREFIX`].
pub fn feed_token(rest: &str) -> Option<&str> {
    rest.strip_suffix(".ics")
        .filter(|t| session::valid_token(t))
}

/// RFC 3986 percent-encoding of everything but unreserved characters.
pub fn encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'.' | b'_' | b'~') {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
pub struct Links {
    /// Plain URL: paste into any calendar's "subscribe by URL".
    pub https_url: String,
    /// Apple Calendar (macOS, iOS) opens this directly.
    pub webcal_url: String,
    pub google_url: String,
    pub outlook_url: String,
    pub outlook365_url: String,
}

pub fn links(site: &str, token: &str) -> Links {
    let https_url = format!("{site}{FEED_PREFIX}{token}.ics");
    let webcal_url = match https_url.split_once("://") {
        Some((_, rest)) => format!("webcal://{rest}"),
        None => https_url.clone(),
    };
    let add = |host: &str| {
        format!(
            "https://{host}/calendar/0/addfromweb?url={}&name={}",
            encode(&https_url),
            encode(FEED_NAME)
        )
    };
    Links {
        google_url: format!(
            "https://calendar.google.com/calendar/r?cid={}",
            encode(&webcal_url)
        ),
        outlook_url: add("outlook.live.com"),
        outlook365_url: add("outlook.office.com"),
        webcal_url,
        https_url,
    }
}

/// The feed body. No plan yet is an empty calendar, so subscribing first works.
pub fn render(
    plan: Option<&Plan>,
    site: &str,
    reminder_minutes: Option<u32>,
    user_id: &str,
) -> String {
    let empty = Plan::default();
    let opts = IcsOptions {
        site: site.to_string(),
        alarm_minutes: reminder_minutes,
        // Unique per user without revealing the id.
        uid_suffix: format!("-{}", &session::sha256_hex(user_id.as_bytes())[..10]),
        name: FEED_NAME.to_string(),
    };
    ical::render(plan.unwrap_or(&empty), &opts)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

    fn plan() -> Plan {
        serde_json::from_str(
            r#"{"version":1,"generated_ms":1794700000000,"tz":"America/Chicago","start":"2026-11-14","end":"2026-11-14",
                "interview_date":null,
                "pace":{"median_secs":{},"speed":{},"new_minutes":{},"best_hour":null},
                "days":[{"date":"2026-11-14","weekday":"sat","rest":false,"minutes":20,"sessions":[
                  {"id":"2026-11-14-1","start_ms":1794672000000,"end_ms":1794673200000,"minutes":20,"title":"1 review",
                   "items":[{"kind":"review","problem":"two-sum","title":"Two Sum","technique":"Hashing","minutes":20,"reason":"due: 1-day review"}]}]}],
                "forecast":[],
                "summary":{"days_left":null,"sessions":1,"minutes":20,"reviews":1,"new":0,"drills":0,"mocks":0,"checkpoints":0,"on_track":true,"behind":[],"headline":"x"}}"#,
        )
        .unwrap()
    }

    #[test]
    fn subscribe_links() {
        let l = links("https://myleet.dev", TOKEN);
        assert_eq!(
            l.https_url,
            format!("https://myleet.dev/api/calendar/{TOKEN}.ics")
        );
        assert_eq!(
            l.webcal_url,
            format!("webcal://myleet.dev/api/calendar/{TOKEN}.ics")
        );
        assert_eq!(
            l.google_url,
            format!(
                "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fmyleet.dev%2Fapi%2Fcalendar%2F{TOKEN}.ics"
            )
        );
        assert!(l.outlook_url.starts_with(
            "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fmyleet.dev"
        ));
        assert!(l.outlook_url.ends_with("&name=myleet%20plan"));
        assert!(l.outlook365_url.starts_with("https://outlook.office.com/"));
        assert_eq!(
            links("http://localhost:8787", TOKEN).webcal_url,
            format!("webcal://localhost:8787/api/calendar/{TOKEN}.ics")
        );
    }

    #[test]
    fn tokens_in_paths() {
        assert_eq!(feed_token(&format!("{TOKEN}.ics")), Some(TOKEN));
        assert_eq!(feed_token(TOKEN), None, "needs .ics");
        assert_eq!(feed_token("token"), None);
        assert_eq!(feed_token("../x.ics"), None);
    }

    #[test]
    fn plan_uploads() {
        let body = serde_json::json!({ "plan": plan() }).to_string();
        assert_eq!(parse_plan(body.as_bytes()).unwrap(), plan());
        assert_eq!(parse_plan(b"{}").unwrap_err().0, 400);
        assert_eq!(parse_plan(br#"{"plan":{"days":"no"}}"#).unwrap_err().0, 400);
        assert_eq!(
            parse_plan(&vec![b' '; MAX_PLAN_BYTES + 1]).unwrap_err().0,
            413
        );
    }

    #[test]
    fn feed_bodies() {
        let empty = render(None, "https://myleet.dev", Some(15), "user-1");
        assert!(empty.starts_with("BEGIN:VCALENDAR\r\n") && empty.ends_with("END:VCALENDAR\r\n"));
        assert!(!empty.contains("VEVENT"));
        let p = plan();
        let ics = render(Some(&p), "https://myleet.dev", Some(15), "user-1");
        assert_eq!(ics.matches("BEGIN:VEVENT").count(), 1);
        let unfolded = ics.replace("\r\n ", "");
        assert!(
            unfolded.contains("TRIGGER:-PT15M")
                && unfolded.contains("https://myleet.dev/p/two-sum")
        );
        assert!(!ics.contains("user-1"), "no account id in the feed");
        let uid = ics.lines().find(|l| l.starts_with("UID:")).unwrap();
        assert!(uid.starts_with("UID:2026-11-14-1-") && uid.ends_with("@myleet"));
        assert_eq!(
            uid,
            render(Some(&p), "https://x", None, "user-1")
                .lines()
                .find(|l| l.starts_with("UID:"))
                .unwrap()
        );
        assert_ne!(
            uid,
            render(Some(&p), "https://x", None, "user-2")
                .lines()
                .find(|l| l.starts_with("UID:"))
                .unwrap()
        );
        assert!(!render(Some(&p), "https://x", None, "u").contains("VALARM"));
    }
}
