//! Two-way calendar sync, the provider-neutral half: the sealed refresh token, the
//! map of events we wrote, the diff that turns the plan's sessions into calendar
//! writes, and reading moves and skips back. `gcal` speaks Google's API; Outlook or
//! Apple would add a module beside it and reuse this one.
//!
//! The plan stays the source of truth. The client asks for changes first (moves and
//! skips become the same moves and shorter days a drag on Plan makes), re-plans, then
//! sends the sessions it wants, and only then do we write to the calendar.

// shortcut: syncs on app open only, no Google push; add events.watch webhooks + cron renewal if users need changes applied while the app is closed

use std::collections::{BTreeMap, HashMap, HashSet};

use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as B64;
use myleet_core::ical;
use myleet_core::planner::{Busy, Session};
use serde::{Deserialize, Serialize};

pub const KEY_BYTES: usize = 32;
pub const NONCE_BYTES: usize = 12;
/// How far ahead sessions go out and busy time comes back.
pub const HORIZON_MS: i64 = 28 * 86_400_000;
pub const BUSY_TTL_MS: u64 = 15 * 60_000;
/// Calendar writes per request; the client calls again while `more` is set. A first
/// sync of four weeks stays under the Workers subrequest limit this way.
pub const MAX_OPS: usize = 40;
pub const MAX_SESSIONS: usize = 200;
pub const MAX_BODY_BYTES: usize = 512 * 1024;

/// The 32-byte key from the `CALENDAR_TOKEN_KEY` secret (standard base64).
pub fn key_from_base64(b64: &str) -> Result<[u8; KEY_BYTES], String> {
    let bytes = B64
        .decode(b64.trim())
        .map_err(|e| format!("token key: {e}"))?;
    bytes
        .try_into()
        .map_err(|_| format!("token key must be {KEY_BYTES} bytes"))
}

/// Binds a sealed token to its row, so a token copied into another user's row fails.
pub fn token_aad(provider: &str, user_id: &str) -> String {
    format!("{provider}:{user_id}")
}

/// AES-256-GCM: base64 of the nonce followed by the ciphertext and tag. The nonce
/// must be fresh random bytes for every value sealed.
pub fn seal(key: &[u8; KEY_BYTES], nonce: [u8; NONCE_BYTES], aad: &str, plain: &str) -> String {
    let cipher = Aes256Gcm::new(key.into());
    let sealed = cipher
        .encrypt(
            &Nonce::from(nonce),
            Payload {
                msg: plain.as_bytes(),
                aad: aad.as_bytes(),
            },
        )
        .expect("AES-GCM encrypts any message this size");
    let mut out = nonce.to_vec();
    out.extend(sealed);
    B64.encode(out)
}

/// Fails on a wrong key, a different `aad`, or any changed byte.
pub fn open(key: &[u8; KEY_BYTES], aad: &str, sealed: &str) -> Result<String, String> {
    let bytes = B64.decode(sealed).map_err(|_| "sealed token unreadable")?;
    if bytes.len() <= NONCE_BYTES {
        return Err("sealed token too short".into());
    }
    let (nonce, ct) = bytes.split_at(NONCE_BYTES);
    let nonce: [u8; NONCE_BYTES] = nonce.try_into().expect("split at NONCE_BYTES");
    let plain = Aes256Gcm::new(key.into())
        .decrypt(
            &Nonce::from(nonce),
            Payload {
                msg: ct,
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| "sealed token failed to open")?;
    String::from_utf8(plain).map_err(|_| "sealed token is not text".into())
}

/// One event we wrote, as we wrote it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub start_ms: i64,
    pub end_ms: i64,
    /// Hash of the title and description, so a wording change is patched.
    pub sig: String,
}

/// Session key to the event that holds it.
pub type EventMap = BTreeMap<String, Entry>;

/// A session as it should look in the calendar.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Wanted {
    /// The session id and its start, so a moved session is a new event and a started
    /// one is never rewritten under a later session that took its id.
    pub key: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub summary: String,
    pub description: String,
}

impl Wanted {
    pub fn sig(&self) -> String {
        let text = format!("{}\n{}", self.summary, self.description);
        crate::session::sha256_hex(text.as_bytes())[..16].to_string()
    }

    pub fn entry(&self, id: &str) -> Entry {
        Entry {
            id: id.to_string(),
            start_ms: self.start_ms,
            end_ms: self.end_ms,
            sig: self.sig(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SessionsBody {
    sessions: Vec<Session>,
}

/// `POST .../sessions` body to the plan's sessions, or the status and message to send.
pub fn parse_sessions(body: &[u8]) -> Result<Vec<Session>, (u16, String)> {
    if body.len() > MAX_BODY_BYTES {
        return Err((413, format!("sessions are over {MAX_BODY_BYTES} bytes")));
    }
    let b: SessionsBody =
        serde_json::from_slice(body).map_err(|e| (400, format!("invalid sessions: {e}")))?;
    if b.sessions.len() > MAX_SESSIONS {
        return Err((400, format!("at most {MAX_SESSIONS} sessions")));
    }
    Ok(b.sessions)
}

/// The sessions to show: not started yet, within the horizon, links on `site`.
pub fn wanted(sessions: &[Session], site: &str, now_ms: i64) -> Vec<Wanted> {
    let mut seen = HashSet::new();
    sessions
        .iter()
        .filter(|s| s.start_ms > now_ms && s.start_ms < now_ms + HORIZON_MS)
        .filter(|s| s.end_ms > s.start_ms)
        .map(|s| Wanted {
            key: format!("{}@{}", s.id, s.start_ms),
            start_ms: s.start_ms,
            end_ms: s.end_ms,
            summary: ical::summary(s),
            description: ical::description(s, site),
        })
        .filter(|w| seen.insert(w.key.clone()))
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Op {
    /// Create the event with this id (or restore it if the id is taken).
    Insert(String, Wanted),
    /// Rewrite the event with this id.
    Patch(String, Wanted),
    /// Remove the event for this key.
    Delete(String, String),
}

/// The calendar writes that make the map match `want`. Events that have started are
/// left alone and drop out of the map: they are history now.
pub fn diff(
    map: &mut EventMap,
    want: &[Wanted],
    now_ms: i64,
    id_of: impl Fn(&str) -> String,
) -> Vec<Op> {
    map.retain(|_, e| e.start_ms > now_ms);
    let keys: HashSet<&str> = want.iter().map(|w| w.key.as_str()).collect();
    let mut ops: Vec<Op> = map
        .iter()
        .filter(|(k, _)| !keys.contains(k.as_str()))
        .map(|(k, e)| Op::Delete(k.clone(), e.id.clone()))
        .collect();
    for w in want {
        match map.get(&w.key) {
            None => ops.push(Op::Insert(id_of(&w.key), w.clone())),
            Some(e) if *e == w.entry(&e.id) => {}
            Some(e) => ops.push(Op::Patch(e.id.clone(), w.clone())),
        }
    }
    ops
}

/// Records a write that the calendar accepted.
pub fn applied(map: &mut EventMap, op: &Op) {
    match op {
        Op::Insert(id, w) | Op::Patch(id, w) => {
            map.insert(w.key.clone(), w.entry(id));
        }
        Op::Delete(key, _) => {
            map.remove(key);
        }
    }
}

/// An event as the calendar has it now.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Remote {
    pub id: String,
    pub cancelled: bool,
    /// Start and end in UTC ms; `None` for an all-day or unreadable time.
    pub times: Option<(i64, i64)>,
}

/// A session the learner moved in their calendar.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Moved {
    pub key: String,
    pub from_start_ms: i64,
    pub from_end_ms: i64,
    pub to_start_ms: i64,
    pub to_end_ms: i64,
}

/// A session the learner deleted in their calendar.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Skipped {
    pub key: String,
    pub start_ms: i64,
    pub end_ms: i64,
}

/// Moves and skips among `remote`, acknowledged in the map so each is reported once.
/// A `full` listing has every event, so a session missing from it was deleted.
pub fn changes(
    map: &mut EventMap,
    remote: &[Remote],
    full: bool,
    now_ms: i64,
) -> (Vec<Moved>, Vec<Skipped>) {
    let by_id: HashMap<String, String> = map
        .iter()
        .filter(|(_, e)| e.start_ms > now_ms)
        .map(|(k, e)| (e.id.clone(), k.clone()))
        .collect();
    let (mut moves, mut skips) = (Vec::new(), Vec::new());
    let mut seen = HashSet::new();
    for r in remote {
        let Some(key) = by_id.get(&r.id) else {
            continue;
        };
        seen.insert(key.clone());
        let e = map.get_mut(key).expect("by_id comes from the map");
        if r.cancelled {
            skips.push(Skipped {
                key: key.clone(),
                start_ms: e.start_ms,
                end_ms: e.end_ms,
            });
            map.remove(key);
        } else if let Some((s, t)) = r.times.filter(|&t| t != (e.start_ms, e.end_ms)) {
            moves.push(Moved {
                key: key.clone(),
                from_start_ms: e.start_ms,
                from_end_ms: e.end_ms,
                to_start_ms: s,
                to_end_ms: t,
            });
            (e.start_ms, e.end_ms) = (s, t);
        }
    }
    if full {
        for key in by_id.values().filter(|k| !seen.contains(*k)) {
            if let Some(e) = map.remove(key) {
                skips.push(Skipped {
                    key: key.clone(),
                    start_ms: e.start_ms,
                    end_ms: e.end_ms,
                });
            }
        }
    }
    (moves, skips)
}

/// Busy time we could not read in full counts as busy for the whole horizon.
pub fn all_busy(now_ms: i64) -> Vec<Busy> {
    vec![Busy {
        start_ms: now_ms,
        end_ms: now_ms + HORIZON_MS,
    }]
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; KEY_BYTES] = [7; KEY_BYTES];
    const NOW: i64 = 1_794_700_000_000;
    const HOUR: i64 = 3_600_000;

    #[test]
    fn sealed_tokens_round_trip_and_reject_tampering() {
        let aad = token_aad("google", "user-1");
        let sealed = seal(&KEY, [1; NONCE_BYTES], &aad, "1//refresh-token");
        assert!(!sealed.contains("refresh"));
        assert_eq!(open(&KEY, &aad, &sealed).unwrap(), "1//refresh-token");
        assert_ne!(
            sealed,
            seal(&KEY, [2; NONCE_BYTES], &aad, "1//refresh-token"),
            "a fresh nonce changes every byte that follows"
        );

        let mut bytes = B64.decode(&sealed).unwrap();
        let last = bytes.len() - 1;
        bytes[last] ^= 1;
        assert!(open(&KEY, &aad, &B64.encode(&bytes)).is_err(), "tag");
        let mut bytes = B64.decode(&sealed).unwrap();
        bytes[NONCE_BYTES] ^= 1;
        assert!(open(&KEY, &aad, &B64.encode(&bytes)).is_err(), "ciphertext");
        let mut bytes = B64.decode(&sealed).unwrap();
        bytes[0] ^= 1;
        assert!(open(&KEY, &aad, &B64.encode(&bytes)).is_err(), "nonce");
        assert!(open(&[8; KEY_BYTES], &aad, &sealed).is_err(), "other key");
        assert!(open(&KEY, &token_aad("google", "user-2"), &sealed).is_err());
        assert!(open(&KEY, &aad, "AAAA").is_err());
        assert!(open(&KEY, &aad, "not base64!").is_err());
    }

    #[test]
    fn token_keys() {
        let k = key_from_base64(&B64.encode(KEY)).unwrap();
        assert_eq!(k, KEY);
        assert!(key_from_base64(&B64.encode([1u8; 16])).is_err());
        assert!(key_from_base64("replace-me").is_err());
    }

    fn session(id: &str, start_ms: i64, title: &str) -> Session {
        serde_json::from_value(serde_json::json!({
            "id": id, "start_ms": start_ms, "end_ms": start_ms + HOUR, "minutes": 60, "title": title,
            "items": [{"kind":"review","problem":"two-sum","title":"Two Sum","technique":"Hashing","minutes":20,"reason":"due"}]
        }))
        .unwrap()
    }

    fn id_of(key: &str) -> String {
        format!("id-{key}")
    }

    #[test]
    fn wanted_sessions() {
        let s = [
            session("past", NOW - HOUR, "x"),
            session("a", NOW + HOUR, "1 review"),
            session("a", NOW + HOUR, "1 review"),
            session("late", NOW + HORIZON_MS + HOUR, "x"),
        ];
        let w = wanted(&s, "https://myleet.dev", NOW);
        assert_eq!(w.len(), 1);
        assert_eq!(w[0].key, format!("a@{}", NOW + HOUR));
        assert_eq!(w[0].summary, "myleet · 1 review (≈60 min)");
        assert!(w[0].description.contains("https://myleet.dev/p/two-sum"));
    }

    #[test]
    fn diff_inserts_patches_deletes_and_leaves_the_rest() {
        let site = "https://myleet.dev";
        let w = wanted(
            &[
                session("a", NOW + HOUR, "1 review"),
                session("b", NOW + 2 * HOUR, "1 review"),
            ],
            site,
            NOW,
        );
        let mut map = EventMap::new();
        let ops = diff(&mut map, &w, NOW, id_of);
        assert!(
            matches!(&ops[..], [Op::Insert(_, a), Op::Insert(_, b)] if a.key == w[0].key && b.key == w[1].key)
        );
        for op in &ops {
            applied(&mut map, op);
        }
        assert_eq!(map[&w[0].key].id, id_of(&w[0].key));
        assert!(diff(&mut map, &w, NOW, id_of).is_empty(), "nothing changed");

        // b's wording changes, a leaves the plan, c is new, and an old event started.
        map.insert(
            "old@1".into(),
            Entry {
                id: "old".into(),
                start_ms: NOW - HOUR,
                end_ms: NOW,
                sig: "s".into(),
            },
        );
        let next = wanted(
            &[
                session("b", NOW + 2 * HOUR, "2 reviews"),
                session("c", NOW + 3 * HOUR, "1 review"),
            ],
            site,
            NOW,
        );
        let ops = diff(&mut map, &next, NOW, id_of);
        assert!(
            !map.contains_key("old@1"),
            "started events drop out, untouched"
        );
        assert_eq!(
            ops,
            vec![
                Op::Delete(w[0].key.clone(), id_of(&w[0].key)),
                Op::Patch(id_of(&w[1].key), next[0].clone()),
                Op::Insert(id_of(&next[1].key), next[1].clone()),
            ]
        );
        for op in &ops {
            applied(&mut map, op);
        }
        assert_eq!(map.len(), 2);
        assert!(diff(&mut map, &next, NOW, id_of).is_empty());
    }

    fn entry(id: &str, start_ms: i64) -> Entry {
        Entry {
            id: id.into(),
            start_ms,
            end_ms: start_ms + HOUR,
            sig: "s".into(),
        }
    }

    #[test]
    fn moves_and_skips_come_back_once() {
        let mut map = EventMap::from([
            ("a".to_string(), entry("ea", NOW + HOUR)),
            ("b".to_string(), entry("eb", NOW + 2 * HOUR)),
            ("c".to_string(), entry("ec", NOW + 3 * HOUR)),
            ("past".to_string(), entry("ep", NOW - HOUR)),
        ]);
        let moved = (NOW + 5 * HOUR, NOW + 6 * HOUR);
        let remote = [
            Remote {
                id: "ea".into(),
                cancelled: false,
                times: Some(moved),
            },
            Remote {
                id: "eb".into(),
                cancelled: true,
                times: None,
            },
            Remote {
                id: "ec".into(),
                cancelled: false,
                times: Some((NOW + 3 * HOUR, NOW + 4 * HOUR)),
            },
            Remote {
                id: "ep".into(),
                cancelled: true,
                times: None,
            },
            Remote {
                id: "someone-else".into(),
                cancelled: true,
                times: None,
            },
            Remote {
                id: "ec".into(),
                cancelled: false,
                times: None,
            },
        ];
        let (moves, skips) = changes(&mut map, &remote, false, NOW);
        assert_eq!(
            moves,
            vec![Moved {
                key: "a".into(),
                from_start_ms: NOW + HOUR,
                from_end_ms: NOW + 2 * HOUR,
                to_start_ms: moved.0,
                to_end_ms: moved.1,
            }]
        );
        assert_eq!(
            skips,
            vec![Skipped {
                key: "b".into(),
                start_ms: NOW + 2 * HOUR,
                end_ms: NOW + 3 * HOUR
            }]
        );
        assert_eq!((map["a"].start_ms, map["a"].end_ms), moved, "acknowledged");
        assert!(!map.contains_key("b") && map.contains_key("past"));
        let (moves, skips) = changes(&mut map, &remote, false, NOW);
        assert!(moves.is_empty() && skips.is_empty(), "reported once");

        // A full listing without c means c was deleted.
        let (moves, skips) = changes(
            &mut map,
            &[Remote {
                id: "ea".into(),
                cancelled: false,
                times: Some(moved),
            }],
            true,
            NOW,
        );
        assert!(moves.is_empty());
        assert_eq!(
            skips.iter().map(|s| s.key.as_str()).collect::<Vec<_>>(),
            ["c"]
        );
        assert!(map.contains_key("past"), "history is not a skip");
    }

    #[test]
    fn session_bodies() {
        let body = serde_json::json!({"sessions": [session("a", NOW, "x")]}).to_string();
        assert_eq!(parse_sessions(body.as_bytes()).unwrap().len(), 1);
        assert_eq!(parse_sessions(b"{}").unwrap_err().0, 400);
        assert_eq!(
            parse_sessions(br#"{"sessions":[],"extra":1}"#)
                .unwrap_err()
                .0,
            400
        );
        let many: Vec<Session> = (0..=MAX_SESSIONS)
            .map(|i| session("a", NOW + i as i64, "x"))
            .collect();
        let body = serde_json::json!({ "sessions": many }).to_string();
        assert_eq!(parse_sessions(body.as_bytes()).unwrap_err().0, 400);
        assert_eq!(
            parse_sessions(&vec![b' '; MAX_BODY_BYTES + 1])
                .unwrap_err()
                .0,
            413
        );
        assert_eq!(
            all_busy(NOW),
            vec![Busy {
                start_ms: NOW,
                end_ms: NOW + HORIZON_MS
            }]
        );
    }
}
