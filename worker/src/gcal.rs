//! Google Calendar for two-way sync: OAuth for the calendar scopes (separate from
//! sign-in, which keeps `openid email profile`), the "myleet" calendar we create,
//! event writes, incremental reads with a sync token, and free/busy on the primary
//! calendar. Only request and reply shapes live here; `api` sends them.

use jiff::Timestamp;
use myleet_core::planner::Busy;
use serde::{Deserialize, Serialize};

use crate::calsync::{Remote, Wanted};
use crate::oauth::encode;

pub const PROVIDER: &str = "google";
pub const CALLBACK_PATH: &str = "/api/calendar/google/callback";
/// Only calendars this app creates, plus free/busy (never event details) elsewhere.
pub const SCOPE_EVENTS: &str = "https://www.googleapis.com/auth/calendar.app.created";
pub const SCOPE_FREEBUSY: &str = "https://www.googleapis.com/auth/calendar.freebusy";
/// Asked for only when the learner presses "Find interviews": reads event titles and times.
pub const SCOPE_READ: &str = "https://www.googleapis.com/auth/calendar.events.readonly";
/// How far ahead "Find interviews" looks.
pub const FIND_DAYS: i64 = 90;
/// Words in an event title that mean an interview; "mock" titles are practice, not one.
const INTERVIEW_WORDS: [&str; 9] = [
    "interview",
    "onsite",
    "on-site",
    "phone screen",
    "tech screen",
    "technical screen",
    "superday",
    "final round",
    "coding round",
];
pub const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
pub const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
pub const FREEBUSY_URL: &str = "https://www.googleapis.com/calendar/v3/freeBusy";
pub const CALENDARS_URL: &str = "https://www.googleapis.com/calendar/v3/calendars";
pub const CALENDAR_NAME: &str = "myleet";
/// Pages of 250 events read before giving up; the sync token is kept until a read finishes.
pub const MAX_PAGES: usize = 10;

pub fn redirect_uri(site: &str) -> String {
    format!("{site}{CALLBACK_PATH}")
}

/// `prompt=consent` so Google returns a refresh token even on a second connect.
/// `read` adds event reading for "Find interviews"; granted scopes carry over.
pub fn authorize_url(client_id: &str, redirect_uri: &str, state: &str, read: bool) -> String {
    let scopes = if read {
        format!("{SCOPE_EVENTS} {SCOPE_FREEBUSY} {SCOPE_READ}")
    } else {
        format!("{SCOPE_EVENTS} {SCOPE_FREEBUSY}")
    };
    format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}\
         &response_type=code&scope={}&state={}&access_type=offline&prompt=consent\
         &include_granted_scopes=true",
        encode(client_id),
        encode(redirect_uri),
        encode(&scopes),
        encode(state),
    )
}

pub fn code_request(client_id: &str, secret: &str, code: &str, redirect_uri: &str) -> String {
    format!(
        "grant_type=authorization_code&code={}&client_id={}&client_secret={}&redirect_uri={}",
        encode(code),
        encode(client_id),
        encode(secret),
        encode(redirect_uri),
    )
}

pub fn refresh_request(client_id: &str, secret: &str, refresh_token: &str) -> String {
    format!(
        "grant_type=refresh_token&refresh_token={}&client_id={}&client_secret={}",
        encode(refresh_token),
        encode(client_id),
        encode(secret),
    )
}

pub fn revoke_request(token: &str) -> String {
    format!("token={}", encode(token))
}

#[derive(Debug, Deserialize)]
pub struct Grant {
    pub access_token: String,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub scope: String,
}

pub fn parse_grant(text: &str) -> Result<Grant, String> {
    let g: Grant = serde_json::from_str(text).map_err(|_| "google: unreadable token reply")?;
    if g.access_token.is_empty() {
        return Err("google: no access token".into());
    }
    Ok(g)
}

/// Google lets the learner untick scopes on the consent screen; sync needs both.
pub fn has_scopes(scope: &str) -> bool {
    let granted: Vec<&str> = scope.split_whitespace().collect();
    granted.contains(&SCOPE_EVENTS) && granted.contains(&SCOPE_FREEBUSY)
}

pub fn can_read(scope: &str) -> bool {
    scope.split_whitespace().any(|s| s == SCOPE_READ)
}

/// The primary calendar's events from `from_ms` for `FIND_DAYS`, titles and starts only.
pub fn find_url(from_ms: i64) -> String {
    format!(
        "{CALENDARS_URL}/primary/events?singleEvents=true&orderBy=startTime&maxResults=250\
         &fields=items(summary,start)&timeMin={}&timeMax={}",
        encode(&rfc3339(from_ms)),
        encode(&rfc3339(from_ms + FIND_DAYS * 86_400_000)),
    )
}

/// An event that looks like an interview. The title goes to the learner's browser to
/// show and match a company; it is never stored.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Found {
    pub date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    pub title: String,
}

#[derive(Deserialize)]
struct FindPage {
    #[serde(default)]
    items: Vec<FindItem>,
}

#[derive(Deserialize)]
struct FindItem {
    #[serde(default)]
    summary: String,
    #[serde(default)]
    start: FindStart,
}

#[derive(Deserialize, Default)]
struct FindStart {
    #[serde(rename = "dateTime")]
    date_time: Option<String>,
    date: Option<String>,
}

pub fn looks_like_interview(title: &str) -> bool {
    let t = title.to_lowercase();
    !t.contains("mock") && INTERVIEW_WORDS.iter().any(|w| t.contains(w))
}

/// Interview-looking events, in order. A timed event keeps the local date and time
/// Google wrote (`2026-12-07T14:00:00-06:00`); an all-day one has no time.
pub fn parse_found(text: &str) -> Result<Vec<Found>, String> {
    let page: FindPage = serde_json::from_str(text).map_err(|_| "google: unreadable events")?;
    Ok(page
        .items
        .into_iter()
        .filter(|i| looks_like_interview(&i.summary))
        .filter_map(|i| {
            let (date, time) = match (i.start.date_time, i.start.date) {
                (Some(dt), _) if dt.len() >= 16 => {
                    (dt[..10].to_string(), Some(dt[11..16].to_string()))
                }
                (_, Some(d)) if d.len() == 10 => (d, None),
                _ => return None,
            };
            Some(Found {
                date,
                time,
                title: i.summary.trim().chars().take(120).collect(),
            })
        })
        .collect())
}

/// A refresh token that was revoked or expired: the link is gone for good.
pub fn is_invalid_grant(status: u16, text: &str) -> bool {
    #[derive(Deserialize)]
    struct E {
        error: Option<String>,
    }
    status == 400
        && serde_json::from_str::<E>(text)
            .is_ok_and(|e| e.error.as_deref() == Some("invalid_grant"))
}

/// Google event ids are base32hex (`0-9a-v`), 5 to 1024 characters. Derived from the
/// session key, so a retried insert finds the event it already made.
pub fn event_id(key: &str) -> String {
    const DIGITS: &[u8; 32] = b"0123456789abcdefghijklmnopqrstuv";
    let hash = crate::session::sha256_hex(key.as_bytes());
    // 128 bits from the hex digest, five bits per character.
    let bits = u128::from_str_radix(&hash[..32], 16).expect("sha256 hex");
    (0..26)
        .map(|i| DIGITS[((bits >> (125 - 5 * i)) & 31) as usize] as char)
        .collect()
}

pub fn calendar_body() -> String {
    serde_json::json!({
        "summary": CALENDAR_NAME,
        "description": "Practice sessions planned by myleet",
    })
    .to_string()
}

pub fn parse_calendar_id(text: &str) -> Result<String, String> {
    #[derive(Deserialize)]
    struct C {
        id: String,
    }
    serde_json::from_str::<C>(text)
        .ok()
        .map(|c| c.id)
        .filter(|id| !id.is_empty())
        .ok_or_else(|| "google: no calendar id".into())
}

pub fn calendar_url(calendar_id: &str) -> String {
    format!("{CALENDARS_URL}/{}", encode(calendar_id))
}

pub fn events_url(calendar_id: &str) -> String {
    format!("{}/events", calendar_url(calendar_id))
}

pub fn event_url(calendar_id: &str, event_id: &str) -> String {
    format!("{}/{}", events_url(calendar_id), encode(event_id))
}

pub fn rfc3339(ms: i64) -> String {
    Timestamp::from_millisecond(ms)
        .unwrap_or(Timestamp::UNIX_EPOCH)
        .strftime("%Y-%m-%dT%H:%M:%SZ")
        .to_string()
}

/// UTC ms of an RFC 3339 time; `None` when it can't be read.
pub fn parse_time(s: &str) -> Option<i64> {
    s.parse::<Timestamp>().ok().map(|t| t.as_millisecond())
}

/// Insert (with `id`) or patch body. `status: confirmed` restores an event the learner
/// deleted when a later plan wants that session back.
pub fn event_body(w: &Wanted, id: Option<&str>, reminder_minutes: Option<u32>) -> String {
    let mut b = serde_json::json!({
        "summary": w.summary,
        "description": w.description,
        "start": {"dateTime": rfc3339(w.start_ms)},
        "end": {"dateTime": rfc3339(w.end_ms)},
        "status": "confirmed",
        "reminders": match reminder_minutes {
            Some(m) => serde_json::json!({"useDefault": false, "overrides": [{"method": "popup", "minutes": m}]}),
            None => serde_json::json!({"useDefault": false}),
        },
    });
    if let Some(id) = id {
        b["id"] = serde_json::json!(id);
    }
    b.to_string()
}

/// One page of `events.list`. Without a sync token this is a full listing.
pub fn list_url(calendar_id: &str, sync_token: Option<&str>, page: Option<&str>) -> String {
    let mut url = format!(
        "{}?showDeleted=true&maxResults=250",
        events_url(calendar_id)
    );
    if let Some(t) = sync_token {
        url.push_str(&format!("&syncToken={}", encode(t)));
    }
    if let Some(p) = page {
        url.push_str(&format!("&pageToken={}", encode(p)));
    }
    url
}

#[derive(Debug, Default)]
pub struct Page {
    pub items: Vec<Remote>,
    pub next_page: Option<String>,
    pub next_sync: Option<String>,
}

#[derive(Deserialize)]
struct When {
    #[serde(rename = "dateTime")]
    date_time: Option<String>,
}

#[derive(Deserialize)]
struct Item {
    id: String,
    #[serde(default)]
    status: String,
    start: Option<When>,
    end: Option<When>,
}

#[derive(Deserialize)]
struct List {
    #[serde(default)]
    items: Vec<Item>,
    #[serde(rename = "nextPageToken")]
    next_page: Option<String>,
    #[serde(rename = "nextSyncToken")]
    next_sync: Option<String>,
}

pub fn parse_page(text: &str) -> Result<Page, String> {
    let l: List = serde_json::from_str(text).map_err(|e| format!("google: events list: {e}"))?;
    let at = |w: &Option<When>| w.as_ref()?.date_time.as_deref().and_then(parse_time);
    Ok(Page {
        items: l
            .items
            .into_iter()
            .map(|i| Remote {
                cancelled: i.status == "cancelled",
                times: at(&i.start).zip(at(&i.end)).filter(|(s, e)| e > s),
                id: i.id,
            })
            .collect(),
        next_page: l.next_page,
        next_sync: l.next_sync,
    })
}

/// Free/busy for the primary calendar only, so the myleet calendar never counts.
pub fn freebusy_body(from_ms: i64, to_ms: i64) -> String {
    serde_json::json!({
        "timeMin": rfc3339(from_ms),
        "timeMax": rfc3339(to_ms),
        "items": [{"id": "primary"}],
    })
    .to_string()
}

/// Busy blocks, or `Err` when any part of the answer can't be trusted: a calendar
/// error, a missing calendar, or a time we can't read. The caller treats that as busy.
pub fn parse_freebusy(text: &str) -> Result<Vec<Busy>, String> {
    #[derive(Deserialize)]
    struct Block {
        start: String,
        end: String,
    }
    #[derive(Deserialize)]
    struct Cal {
        #[serde(default)]
        busy: Vec<Block>,
        #[serde(default)]
        errors: Vec<serde_json::Value>,
    }
    #[derive(Deserialize)]
    struct Reply {
        calendars: std::collections::BTreeMap<String, Cal>,
    }
    let r: Reply = serde_json::from_str(text).map_err(|e| format!("google: freebusy: {e}"))?;
    let only = (r.calendars.len() == 1)
        .then(|| r.calendars.values().next())
        .flatten();
    let cal = r
        .calendars
        .get("primary")
        .or(only)
        .ok_or("google: freebusy has no primary calendar")?;
    if !cal.errors.is_empty() {
        return Err("google: freebusy reported an error".into());
    }
    cal.busy
        .iter()
        .map(|b| match (parse_time(&b.start), parse_time(&b.end)) {
            (Some(start_ms), Some(end_ms)) if end_ms >= start_ms => Ok(Busy { start_ms, end_ms }),
            _ => Err(format!("google: unreadable busy block {:?}", b.start)),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_794_700_000_000;

    #[test]
    fn authorize_url_asks_for_both_calendar_scopes_offline() {
        let u = authorize_url("id", &redirect_uri("https://myleet.dev"), "s1", false);
        assert!(u.starts_with("https://accounts.google.com/o/oauth2/v2/auth?client_id=id"));
        assert!(u.contains(
            "redirect_uri=https%3A%2F%2Fmyleet.dev%2Fapi%2Fcalendar%2Fgoogle%2Fcallback"
        ));
        assert!(u.contains(
            "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.app.created%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.freebusy"
        ));
        for p in [
            "access_type=offline",
            "prompt=consent",
            "include_granted_scopes=true",
            "state=s1",
            "response_type=code",
        ] {
            assert!(u.contains(p), "{p}");
        }
        assert!(!u.contains("openid"), "sign-in scopes stay with sign-in");
    }

    #[test]
    fn grants_and_scopes() {
        let g = parse_grant(&format!(
            r#"{{"access_token":"ya29","refresh_token":"1//r","scope":"openid {SCOPE_FREEBUSY} {SCOPE_EVENTS}","expires_in":3599}}"#
        ))
        .unwrap();
        assert_eq!(g.refresh_token.as_deref(), Some("1//r"));
        assert!(has_scopes(&g.scope));
        assert!(!has_scopes(SCOPE_EVENTS), "free/busy unticked");
        assert!(parse_grant(r#"{"error":"invalid_grant"}"#).is_err());
        assert!(is_invalid_grant(
            400,
            r#"{"error":"invalid_grant","error_description":"Token has been expired or revoked."}"#
        ));
        assert!(!is_invalid_grant(500, r#"{"error":"invalid_grant"}"#));
        assert!(!is_invalid_grant(400, "nope"));
        assert_eq!(
            refresh_request("id", "s&c", "1//r"),
            "grant_type=refresh_token&refresh_token=1%2F%2Fr&client_id=id&client_secret=s%26c"
        );
        assert!(code_request("id", "sec", "4/x", "https://x/cb").contains("code=4%2Fx"));
        assert_eq!(revoke_request("1//r"), "token=1%2F%2Fr");
    }

    #[test]
    fn event_ids_are_stable_base32hex() {
        let a = event_id("2026-11-17-1@1794700000000");
        assert_eq!(a, event_id("2026-11-17-1@1794700000000"));
        assert_ne!(a, event_id("2026-11-17-2@1794700000000"));
        assert_eq!(a.len(), 26);
        assert!(a.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'v')));
    }

    #[test]
    fn event_bodies() {
        let w = Wanted {
            key: "k".into(),
            start_ms: NOW,
            end_ms: NOW + 3_600_000,
            summary: "myleet · 1 review (≈20 min)".into(),
            description: "Review: Two Sum".into(),
        };
        let b: serde_json::Value =
            serde_json::from_str(&event_body(&w, Some("abc12"), Some(15))).unwrap();
        assert_eq!(b["id"], "abc12");
        assert_eq!(b["start"]["dateTime"], rfc3339(NOW));
        assert!(b["start"]["dateTime"].as_str().unwrap().ends_with('Z'));
        assert_eq!(b["reminders"]["overrides"][0]["minutes"], 15);
        assert_eq!(b["status"], "confirmed");
        let patch: serde_json::Value = serde_json::from_str(&event_body(&w, None, None)).unwrap();
        assert!(patch.get("id").is_none());
        assert_eq!(patch["reminders"], serde_json::json!({"useDefault": false}));
    }

    #[test]
    fn urls() {
        let cal = "abc@group.calendar.google.com";
        assert_eq!(
            event_url(cal, "e1"),
            "https://www.googleapis.com/calendar/v3/calendars/abc%40group.calendar.google.com/events/e1"
        );
        let full = list_url(cal, None, None);
        assert!(full.ends_with("/events?showDeleted=true&maxResults=250"));
        let inc = list_url(cal, Some("tok=="), Some("p2"));
        assert!(inc.ends_with("&syncToken=tok%3D%3D&pageToken=p2"));
    }

    #[test]
    fn event_pages() {
        let p = parse_page(
            r#"{"nextSyncToken":"s2","items":[
              {"id":"a","status":"confirmed","start":{"dateTime":"2026-11-17T19:00:00-06:00"},"end":{"dateTime":"2026-11-17T20:00:00-06:00"}},
              {"id":"b","status":"cancelled"},
              {"id":"c","status":"confirmed","start":{"date":"2026-11-17"},"end":{"date":"2026-11-18"}}]}"#,
        )
        .unwrap();
        assert_eq!(p.next_sync.as_deref(), Some("s2"));
        assert!(p.next_page.is_none());
        let start = parse_time("2026-11-18T01:00:00Z").unwrap();
        assert_eq!(
            p.items[0],
            Remote {
                id: "a".into(),
                cancelled: false,
                times: Some((start, start + 3_600_000))
            }
        );
        assert!(p.items[1].cancelled);
        assert_eq!(p.items[2].times, None, "all-day: not a move");
        assert_eq!(
            parse_page(r#"{"nextPageToken":"p2"}"#)
                .unwrap()
                .next_page
                .as_deref(),
            Some("p2")
        );
        assert!(parse_page("<html>").is_err());
    }

    #[test]
    fn freebusy_fails_closed() {
        let body: serde_json::Value =
            serde_json::from_str(&freebusy_body(NOW, NOW + 1000)).unwrap();
        assert_eq!(body["items"], serde_json::json!([{"id": "primary"}]));
        assert!(body["timeMin"].as_str().unwrap().ends_with('Z'));

        let ok = parse_freebusy(
            r#"{"calendars":{"primary":{"busy":[{"start":"2026-11-17T15:00:00Z","end":"2026-11-17T16:00:00-05:00"}]}}}"#,
        )
        .unwrap();
        assert_eq!(
            ok,
            vec![Busy {
                start_ms: parse_time("2026-11-17T15:00:00Z").unwrap(),
                end_ms: parse_time("2026-11-17T21:00:00Z").unwrap(),
            }]
        );
        assert_eq!(
            parse_freebusy(r#"{"calendars":{"ann@example.com":{"busy":[]}}}"#).unwrap(),
            vec![],
            "a single calendar keyed by its address"
        );
        for bad in [
            r#"{"calendars":{"primary":{"busy":[],"errors":[{"domain":"global","reason":"backendError"}]}}}"#,
            r#"{"calendars":{"primary":{"busy":[{"start":"soon","end":"2026-11-17T16:00:00Z"}]}}}"#,
            r#"{"calendars":{"primary":{"busy":[{"start":"2026-11-17T17:00:00Z","end":"2026-11-17T16:00:00Z"}]}}}"#,
            r#"{"calendars":{}}"#,
            r#"{"calendars":{"a":{},"b":{}}}"#,
            "not json",
        ] {
            assert!(parse_freebusy(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn finds_interviews_by_title_with_local_date_and_time() {
        let text = r#"{"items":[
            {"summary":"Google onsite interview","start":{"dateTime":"2026-12-07T14:00:00-06:00"}},
            {"summary":"Dentist","start":{"dateTime":"2026-12-08T09:00:00-06:00"}},
            {"summary":"Mock interview with Sam","start":{"dateTime":"2026-12-09T18:00:00-06:00"}},
            {"summary":"Meta phone screen","start":{"date":"2026-12-10"}}
        ]}"#;
        let found = parse_found(text).unwrap();
        assert_eq!(
            found,
            [
                Found {
                    date: "2026-12-07".into(),
                    time: Some("14:00".into()),
                    title: "Google onsite interview".into()
                },
                Found {
                    date: "2026-12-10".into(),
                    time: None,
                    title: "Meta phone screen".into()
                },
            ]
        );
        assert!(can_read(&format!("openid {SCOPE_READ}")) && !can_read(SCOPE_FREEBUSY));
        assert!(authorize_url("c", "r", "s", true).contains("events.readonly"));
        assert!(!authorize_url("c", "r", "s", false).contains("events.readonly"));
    }
}
