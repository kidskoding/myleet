//! A plan as an iCalendar (RFC 5545) feed: one VEVENT per session. Times are UTC
//! (`...Z`), which every client shows in its own zone and which needs no VTIMEZONE.
//! UIDs come from the session id, so a re-published feed replaces events in place.

use jiff::Timestamp;
use serde::Deserialize;

use crate::planner::{ItemKind, Plan};

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct IcsOptions {
    /// Site origin for links, e.g. `https://myleet.dev` (no trailing slash).
    pub site: String,
    /// Minutes before each session for a reminder; `None` for no alarm.
    pub alarm_minutes: Option<u32>,
    /// Appended to every UID so two feeds never share one, e.g. a hash of the user.
    pub uid_suffix: String,
    pub name: String,
}

impl Default for IcsOptions {
    fn default() -> IcsOptions {
        IcsOptions {
            site: String::new(),
            alarm_minutes: Some(15),
            uid_suffix: String::new(),
            name: "myleet plan".into(),
        }
    }
}

/// RFC 5545 TEXT escaping.
pub fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            ';' => out.push_str("\\;"),
            ',' => out.push_str("\\,"),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            c => out.push(c),
        }
    }
    out
}

/// Folds one content line to at most 75 octets per physical line, never splitting a
/// UTF-8 character, and terminates it with CRLF.
pub fn fold(line: &str, out: &mut String) {
    let mut limit = 75;
    let mut rest = line;
    while rest.len() > limit {
        let mut cut = limit;
        while !rest.is_char_boundary(cut) {
            cut -= 1;
        }
        out.push_str(&rest[..cut]);
        out.push_str("\r\n ");
        rest = &rest[cut..];
        limit = 74; // the leading space counts
    }
    out.push_str(rest);
    out.push_str("\r\n");
}

fn utc(ms: i64) -> String {
    Timestamp::from_millisecond(ms)
        .unwrap_or(Timestamp::UNIX_EPOCH)
        .strftime("%Y%m%dT%H%M%SZ")
        .to_string()
}

fn label(k: ItemKind) -> &'static str {
    match k {
        ItemKind::Review => "Review",
        ItemKind::New => "New",
        ItemKind::Drill => "Drill",
        ItemKind::Note => "Read",
        ItemKind::Mock => "Mock",
        ItemKind::Checkpoint => "Check-in",
    }
}

pub fn render(plan: &Plan, o: &IcsOptions) -> String {
    let mut out = String::new();
    let mut line = |s: String| fold(&s, &mut out);
    line("BEGIN:VCALENDAR".into());
    line("VERSION:2.0".into());
    line("PRODID:-//myleet//plan//EN".into());
    line("CALSCALE:GREGORIAN".into());
    line("METHOD:PUBLISH".into());
    line(format!("X-WR-CALNAME:{}", escape(&o.name)));
    line(format!("NAME:{}", escape(&o.name)));
    line("X-WR-CALDESC:Practice sessions planned by myleet".into());
    if !plan.tz.is_empty() {
        line(format!("X-WR-TIMEZONE:{}", escape(&plan.tz)));
    }
    line("REFRESH-INTERVAL;VALUE=DURATION:PT1H".into());
    line("X-PUBLISHED-TTL:PT1H".into());
    let stamp = utc(plan.generated_ms);
    for iv in &plan.interviews {
        let Ok(day) = iv.date.parse::<jiff::civil::Date>() else {
            continue;
        };
        let next = day.tomorrow().unwrap_or(day);
        let ymd = |d: jiff::civil::Date| format!("{:04}{:02}{:02}", d.year(), d.month(), d.day());
        line("BEGIN:VEVENT".into());
        line(format!(
            "UID:interview-{}-{}{}@myleet",
            iv.date,
            iv.company.as_deref().unwrap_or("any"),
            o.uid_suffix
        ));
        line(format!("DTSTAMP:{stamp}"));
        line(format!("DTSTART;VALUE=DATE:{}", ymd(day)));
        line(format!("DTEND;VALUE=DATE:{}", ymd(next)));
        let who = iv
            .name
            .as_deref()
            .map_or("Interview".to_string(), |n| format!("{n} interview"));
        line(format!("SUMMARY:{}", escape(&who)));
        line("TRANSP:TRANSPARENT".into());
        line("END:VEVENT".into());
    }
    for s in plan.days.iter().flat_map(|d| &d.sessions) {
        let mut desc = Vec::new();
        for it in &s.items {
            desc.push(format!(
                "{}: {} ({} min) - {}",
                label(it.kind),
                it.title,
                it.minutes,
                it.reason
            ));
            let link = match (&it.problem, it.kind) {
                (Some(id), _) => format!("{}/p/{id}", o.site),
                (None, ItemKind::Mock) => format!("{}/mock", o.site),
                _ => format!("{}/today", o.site),
            };
            desc.push(link);
        }
        line("BEGIN:VEVENT".into());
        line(format!("UID:{}{}@myleet", s.id, o.uid_suffix));
        line(format!("DTSTAMP:{stamp}"));
        line(format!("DTSTART:{}", utc(s.start_ms)));
        line(format!("DTEND:{}", utc(s.end_ms)));
        line(format!(
            "SUMMARY:{}",
            escape(&format!("myleet · {} (≈{} min)", s.title, s.minutes))
        ));
        line(format!("DESCRIPTION:{}", escape(&desc.join("\n"))));
        if !o.site.is_empty() {
            line(format!("URL:{}/today", o.site));
        }
        if let Some(m) = o.alarm_minutes {
            line("BEGIN:VALARM".into());
            line("ACTION:DISPLAY".into());
            line(format!(
                "DESCRIPTION:{}",
                escape(&format!("myleet: {}", s.title))
            ));
            line(format!("TRIGGER:-PT{m}M"));
            line("END:VALARM".into());
        }
        line("END:VEVENT".into());
    }
    line("END:VCALENDAR".into());
    out
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::planner::{self, Settings};
    use crate::testutil::{chicago, good_catalog};

    /// A strict reader for what `render` must produce: CRLF lines of at most 75
    /// octets, balanced components, required properties, valid UTC times, and no
    /// unescaped commas or semicolons in TEXT values. Returns unfolded lines.
    pub fn check(ics: &str) -> Result<Vec<String>, String> {
        if !ics.ends_with("\r\n") {
            return Err("must end with CRLF".into());
        }
        let mut lines: Vec<String> = Vec::new();
        for raw in ics[..ics.len() - 2].split("\r\n") {
            if raw.len() > 75 {
                return Err(format!("line over 75 octets: {raw:?}"));
            }
            if raw.contains('\n') || raw.contains('\r') {
                return Err(format!("bare line break in {raw:?}"));
            }
            match raw.strip_prefix(' ') {
                Some(cont) => lines.last_mut().ok_or("continuation first")?.push_str(cont),
                None => lines.push(raw.to_string()),
            }
        }
        // Each open component with the parent's properties saved underneath it.
        let mut stack: Vec<(String, Vec<String>)> = Vec::new();
        let mut props: Vec<String> = Vec::new();
        for l in &lines {
            let (name, value) = l.split_once(':').ok_or(format!("no colon: {l}"))?;
            let name = name.split(';').next().unwrap_or(name);
            match name {
                "BEGIN" => stack.push((value.into(), std::mem::take(&mut props))),
                "END" => {
                    let Some((open, parent)) = stack.pop().filter(|(n, _)| n == value) else {
                        return Err(format!("unbalanced END:{value}"));
                    };
                    let props = std::mem::replace(&mut props, parent);
                    debug_assert_eq!(open, value);
                    if value == "VEVENT" {
                        for need in ["UID", "DTSTAMP", "DTSTART", "DTEND", "SUMMARY"] {
                            if !props.iter().any(|p| p == need) {
                                return Err(format!("VEVENT missing {need}"));
                            }
                        }
                    }
                    if value == "VALARM"
                        && !(props.iter().any(|p| p == "TRIGGER")
                            && props.iter().any(|p| p == "ACTION"))
                    {
                        return Err("VALARM needs ACTION and TRIGGER".into());
                    }
                }
                "DTSTART" | "DTEND" | "DTSTAMP" => {
                    let all_day = l.contains(";VALUE=DATE:")
                        && value.len() == 8
                        && value.bytes().all(|b| b.is_ascii_digit());
                    let ok = all_day
                        || value.len() == 16
                            && value.ends_with('Z')
                            && value.as_bytes()[8] == b'T'
                            && value
                                .bytes()
                                .enumerate()
                                .all(|(i, b)| i == 8 || i == 15 || b.is_ascii_digit());
                    if !ok {
                        return Err(format!("bad UTC time {value}"));
                    }
                    props.push(name.into());
                }
                "SUMMARY" | "DESCRIPTION" | "X-WR-CALNAME" | "NAME" => {
                    let b = value.as_bytes();
                    for (i, &c) in b.iter().enumerate() {
                        if (c == b',' || c == b';') && (i == 0 || b[i - 1] != b'\\') {
                            return Err(format!("unescaped {} in {name}", c as char));
                        }
                    }
                    props.push(name.into());
                }
                _ => props.push(name.into()),
            }
        }
        if !stack.is_empty() || lines.first().map(String::as_str) != Some("BEGIN:VCALENDAR") {
            return Err("calendar not closed".into());
        }
        Ok(lines)
    }

    #[test]
    fn folding_keeps_utf8_and_length() {
        let mut out = String::new();
        let long = format!("DESCRIPTION:{}", "é·".repeat(60));
        fold(&long, &mut out);
        for l in out.trim_end_matches("\r\n").split("\r\n") {
            assert!(l.len() <= 75, "{}", l.len());
        }
        let unfolded = out.trim_end_matches("\r\n").replace("\r\n ", "");
        assert_eq!(unfolded, long);
    }

    #[test]
    fn escaping() {
        assert_eq!(escape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
    }

    #[test]
    fn plan_renders_a_valid_feed() {
        let s: Settings = serde_json::from_str(
            r#"{"interviews":[{"date":"2026-11-28","company":"meta"},{"date":"2026-12-05","company":"stripe"}],"availability":[{"days":["mon","wed","sat"],"start":"19:00","end":"20:30"}]}"#,
        )
        .unwrap();
        let now = jiff::civil::date(2026, 11, 14)
            .at(8, 0, 0, 0)
            .to_zoned(chicago())
            .unwrap()
            .timestamp();
        let plan =
            planner::plan(&good_catalog(), &[], &s, now, &chicago(), "America/Chicago").unwrap();
        let o = IcsOptions {
            site: "https://myleet.dev".into(),
            uid_suffix: "-ab12".into(),
            ..IcsOptions::default()
        };
        let ics = render(&plan, &o);
        let lines = check(&ics).unwrap_or_else(|e| panic!("{e}\n{ics}"));
        let events = lines.iter().filter(|l| *l == "BEGIN:VEVENT").count();
        let sessions: usize = plan.days.iter().map(|d| d.sessions.len()).sum();
        assert!(sessions > 0);
        assert_eq!(events, sessions + 2);
        assert!(
            lines.contains(&"DTSTART;VALUE=DATE:20261128".to_string()),
            "{ics}"
        );
        assert!(lines.contains(&"DTEND;VALUE=DATE:20261129".to_string()));
        assert!(lines.contains(&"SUMMARY:Meta interview".to_string()));
        assert!(lines.contains(&"SUMMARY:Stripe interview".to_string()));
        assert!(lines.contains(&"X-WR-CALNAME:myleet plan".to_string()));
        assert!(lines.contains(&"X-WR-TIMEZONE:America/Chicago".to_string()));
        // Saturday Nov 14 19:00 Chicago (CST, UTC-6) is 01:00Z on the 15th.
        assert!(
            lines.contains(&"DTSTART:20261115T010000Z".to_string()),
            "{ics}"
        );
        assert!(lines.contains(&"UID:2026-11-14-1-ab12@myleet".to_string()));
        assert!(
            lines
                .iter()
                .any(|l| l.starts_with("SUMMARY:myleet · ") && l.ends_with(" min)"))
        );
        assert!(lines.iter().any(|l| l.contains("https://myleet.dev/p/")));
        assert!(lines.contains(&"TRIGGER:-PT15M".to_string()));
        let quiet = render(
            &plan,
            &IcsOptions {
                alarm_minutes: None,
                ..o
            },
        );
        assert!(!quiet.contains("VALARM"));
        // Same plan, same bytes: subscribers see no churn.
        assert_eq!(
            ics,
            render(
                &plan,
                &IcsOptions {
                    site: "https://myleet.dev".into(),
                    uid_suffix: "-ab12".into(),
                    ..IcsOptions::default()
                }
            )
        );
    }

    #[test]
    fn checker_rejects_bad_feeds() {
        assert!(
            check("BEGIN:VCALENDAR\r\nEND:VCALENDAR").is_err(),
            "no final CRLF"
        );
        assert!(check("BEGIN:VCALENDAR\r\nSUMMARY:a,b\r\nEND:VCALENDAR\r\n").is_err());
        assert!(
            check("BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n")
                .is_err()
        );
        assert!(
            check(&format!(
                "BEGIN:VCALENDAR\r\nX:{}\r\nEND:VCALENDAR\r\n",
                "a".repeat(80)
            ))
            .is_err()
        );
        assert!(check("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n").is_ok());
    }
}
