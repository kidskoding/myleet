//! Progress sync: one D1 row per user holding the whole `events.jsonl` and the Notes
//! reader's highlights, guarded by a version number so two devices never overwrite
//! each other silently. Notes ride on the same row so a sync is still one row write.

use std::collections::BTreeMap;

use serde::Deserialize;
use serde::de::IgnoredAny;

use crate::account::PublicSummary;

/// D1 caps a row at 2,000,000 bytes; events and notes share it, with room for the
/// other columns.
pub const MAX_EVENTS_BYTES: usize = 1_750_000;
pub const MAX_NOTES_BYTES: usize = 150_000;
const MAX_ANNOTATIONS: usize = 2000;
const MAX_READS: usize = 2000;
const MAX_ID: usize = 64;
const MAX_NOTE_PATH: usize = 300;
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
    /// The reader's highlights, notes and reading progress as one JSON object (the
    /// client merges by id and `updated`). Absent keeps the stored copy.
    #[serde(default)]
    pub notes_json: Option<String>,
}

/// The parts of the notes blob the Worker checks; everything else round-trips opaque.
#[derive(Deserialize)]
struct NotesBlob {
    #[serde(default)]
    annotations: Vec<AnnotationRef>,
    #[serde(default)]
    reads: BTreeMap<String, IgnoredAny>,
}

#[derive(Deserialize)]
struct AnnotationRef {
    id: String,
    note: String,
    /// Checked to be a number; the client merges on it.
    #[allow(dead_code)]
    updated: u64,
}

pub fn validate_notes(json: &str) -> Result<(), String> {
    if json.len() > MAX_NOTES_BYTES {
        return Err(format!("notes_json is over {MAX_NOTES_BYTES} bytes"));
    }
    if !json.trim_start().starts_with('{') {
        return Err("notes_json must be a JSON object".to_string());
    }
    let blob: NotesBlob = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if blob.annotations.len() > MAX_ANNOTATIONS {
        return Err(format!("at most {MAX_ANNOTATIONS} annotations"));
    }
    if blob.reads.len() > MAX_READS {
        return Err(format!("at most {MAX_READS} reads"));
    }
    let ok = |a: &AnnotationRef| {
        (1..=MAX_ID).contains(&a.id.len()) && (1..=MAX_NOTE_PATH).contains(&a.note.len())
    };
    if !blob.annotations.iter().all(ok) || !blob.reads.keys().all(|k| k.len() <= MAX_NOTE_PATH) {
        return Err(format!(
            "annotation ids are 1-{MAX_ID} characters and note paths 1-{MAX_NOTE_PATH}"
        ));
    }
    Ok(())
}

#[derive(Debug, PartialEq, Eq)]
pub enum PutError {
    TooLarge,
    BadJson(String),
    BadVersion,
    /// 1-based line number of an event that is not a JSON object.
    BadLine(usize),
    BadSummary(String),
    NotesTooLarge,
    BadNotes(String),
}

impl PutError {
    pub fn status(&self) -> u16 {
        match self {
            PutError::TooLarge | PutError::NotesTooLarge => 413,
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
            PutError::NotesTooLarge => format!("notes_json is over {MAX_NOTES_BYTES} bytes"),
            PutError::BadNotes(e) => format!("notes_json: {e}"),
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
    if let Some(notes) = &put.notes_json {
        if notes.len() > MAX_NOTES_BYTES {
            return Err(PutError::NotesTooLarge);
        }
        validate_notes(notes).map_err(PutError::BadNotes)?;
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
    fn notes_ride_along() {
        let notes = r#"{"v":1,"annotations":[{"id":"m1abc","note":"curriculum/01/notes/01.md","quote":"x","updated":5,"deleted":true}],"reads":{"curriculum/01/notes/01.md":{"pct":0.5,"read":false,"at":5}}}"#;
        let with_notes =
            serde_json::json!({"base_version": 2, "events_jsonl": "", "notes_json": notes});
        let put = parse_put(with_notes.to_string().as_bytes()).unwrap();
        assert_eq!(put.notes_json.as_deref(), Some(notes), "stored unchanged");
        assert_eq!(parse_put(&body(1, "")).unwrap().notes_json, None);
        for bad in [
            "[]",
            "{\"annotations\":[{\"id\":\"\",\"note\":\"n\",\"updated\":1}]}",
            "{\"annotations\":[{\"id\":\"a\",\"updated\":1}]}",
            "{\"annotations\":{}}",
            "{nope",
        ] {
            assert!(validate_notes(bad).is_err(), "{bad}");
            let b = serde_json::json!({"base_version": 1, "events_jsonl": "", "notes_json": bad});
            assert!(
                matches!(
                    parse_put(b.to_string().as_bytes()),
                    Err(PutError::BadNotes(_))
                ),
                "{bad}"
            );
        }
        assert!(validate_notes("{}").is_ok());
        let many = format!(
            r#"{{"annotations":[{}]}}"#,
            vec![r#"{"id":"a","note":"n","updated":1}"#; MAX_ANNOTATIONS + 1].join(",")
        );
        assert!(validate_notes(&many).is_err());
        let huge = format!(r#"{{"pad":"{}"}}"#, "x".repeat(MAX_NOTES_BYTES));
        let b = serde_json::json!({"base_version": 1, "events_jsonl": "", "notes_json": huge});
        assert_eq!(
            parse_put(b.to_string().as_bytes()).unwrap_err(),
            PutError::NotesTooLarge
        );
        assert_eq!(PutError::NotesTooLarge.status(), 413);
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
