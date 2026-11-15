//! Progress sync: one D1 row per user holding the whole `events.jsonl`, guarded by a
//! version number so two devices never overwrite each other silently.

use serde::Deserialize;
use serde::de::IgnoredAny;

use crate::account::PublicSummary;

/// D1 caps a row at 2,000,000 bytes; leave room for the other columns.
pub const MAX_EVENTS_BYTES: usize = 1_900_000;
/// JSON string escaping inflates the events (every `"` becomes `\"`).
pub const MAX_BODY_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PutBody {
    /// The version the client last saw; 0 when it has never synced.
    pub base_version: i64,
    pub events_jsonl: String,
    /// Streak, mastery and heatmap for the opt-in public profile.
    #[serde(default)]
    pub summary: Option<PublicSummary>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PutError {
    TooLarge,
    BadJson(String),
    BadVersion,
    /// 1-based line number of an event that is not a JSON object.
    BadLine(usize),
    BadSummary(String),
}

impl PutError {
    pub fn status(&self) -> u16 {
        match self {
            PutError::TooLarge => 413,
            _ => 400,
        }
    }

    pub fn message(&self) -> String {
        match self {
            PutError::TooLarge => format!("events_jsonl is over {MAX_EVENTS_BYTES} bytes"),
            PutError::BadJson(e) => format!("invalid body: {e}"),
            PutError::BadVersion => "base_version must be >= 0".to_string(),
            PutError::BadLine(n) => format!("events_jsonl line {n} is not a JSON object"),
            PutError::BadSummary(e) => format!("summary: {e}"),
        }
    }
}

pub fn parse_put(body: &[u8]) -> Result<PutBody, PutError> {
    if body.len() > MAX_BODY_BYTES {
        return Err(PutError::TooLarge);
    }
    let put: PutBody =
        serde_json::from_slice(body).map_err(|e| PutError::BadJson(e.to_string()))?;
    if put.base_version < 0 {
        return Err(PutError::BadVersion);
    }
    if put.events_jsonl.len() > MAX_EVENTS_BYTES {
        return Err(PutError::TooLarge);
    }
    // Lines stay opaque beyond this so events from a newer client round-trip
    // unchanged; IgnoredAny checks syntax without building values (CPU budget).
    for (i, line) in put.events_jsonl.lines().enumerate() {
        let line = line.trim();
        if !line.is_empty()
            && (!line.starts_with('{') || serde_json::from_str::<IgnoredAny>(line).is_err())
        {
            return Err(PutError::BadLine(i + 1));
        }
    }
    if let Some(summary) = &put.summary {
        summary.validate().map_err(PutError::BadSummary)?;
    }
    Ok(put)
}

/// Which guarded statement applies the write.
#[derive(Debug, PartialEq, Eq)]
pub enum Write {
    /// First sync: insert, doing nothing if a row already exists.
    Insert,
    /// Update only while the stored version still equals `expected`.
    Update { expected: i64 },
}

pub fn plan(base_version: i64) -> Write {
    if base_version == 0 {
        Write::Insert
    } else {
        Write::Update {
            expected: base_version,
        }
    }
}

/// `changes` is how many rows the guarded statement touched. Zero means another
/// device synced first, so the client must fetch, merge and retry (`None`, a 409).
pub fn outcome(base_version: i64, changes: usize) -> Option<i64> {
    (changes == 1).then_some(base_version + 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(base: i64, events: &str) -> Vec<u8> {
        serde_json::json!({"base_version": base, "events_jsonl": events})
            .to_string()
            .into_bytes()
    }

    #[test]
    fn valid_put_parses() {
        let events = "{\"t\":\"2026-01-01T00:00:00Z\",\"kind\":\"opened\"}\n\n{\"t\":\"x\"}\n";
        let put = parse_put(&body(3, events)).unwrap();
        assert_eq!(put.base_version, 3);
        assert_eq!(put.events_jsonl, events);
        assert!(parse_put(&body(0, "")).is_ok());
        let with_summary = br#"{"base_version":1,"events_jsonl":"","summary":{"streak":1,"mastered":0,"solved":1,"heatmap":{"2026-11-14":1}}}"#;
        assert_eq!(parse_put(with_summary).unwrap().summary.unwrap().streak, 1);
    }

    #[test]
    fn bad_puts_rejected() {
        assert_eq!(parse_put(&body(-1, "")).unwrap_err(), PutError::BadVersion);
        assert_eq!(
            parse_put(&body(1, "{\"a\":1}\n[1,2]\n")).unwrap_err(),
            PutError::BadLine(2)
        );
        assert_eq!(
            parse_put(&body(1, "nope")).unwrap_err(),
            PutError::BadLine(1)
        );
        assert_eq!(
            parse_put(&body(1, "{\"a\":")).unwrap_err(),
            PutError::BadLine(1)
        );
        let bad_summary = br#"{"base_version":1,"events_jsonl":"","summary":{"streak":1,"mastered":0,"solved":1,"heatmap":{"today":1}}}"#;
        assert!(matches!(
            parse_put(bad_summary),
            Err(PutError::BadSummary(_))
        ));
        assert!(matches!(parse_put(b"{}"), Err(PutError::BadJson(_))));
        assert!(matches!(
            parse_put(br#"{"base_version":1,"events_jsonl":"","x":1}"#),
            Err(PutError::BadJson(_))
        ));
    }

    #[test]
    fn size_caps() {
        let line = "{\"k\":\"vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv\"}\n";
        let big = line.repeat(MAX_EVENTS_BYTES / line.len() + 1);
        assert_eq!(parse_put(&body(1, &big)).unwrap_err(), PutError::TooLarge);
        assert_eq!(PutError::TooLarge.status(), 413);
        let huge = vec![b' '; MAX_BODY_BYTES + 1];
        assert_eq!(parse_put(&huge).unwrap_err(), PutError::TooLarge);
    }

    #[test]
    fn version_conflicts() {
        assert_eq!(plan(0), Write::Insert);
        assert_eq!(plan(7), Write::Update { expected: 7 });
        assert_eq!(outcome(0, 1), Some(1));
        assert_eq!(outcome(7, 1), Some(8));
        assert_eq!(outcome(0, 0), None, "a second first-sync must conflict");
        assert_eq!(outcome(7, 0), None, "a stale base must conflict");
    }
}
