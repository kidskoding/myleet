//! A learner's public LeetCode profile, read through alfa-leetcode-api first and
//! LeetCode's own GraphQL when that is slow or down. Both normalize to one shape.

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

pub const GRAPHQL: &str = "https://leetcode.com/graphql";
/// An hour, so returning to myleet after a LeetCode session picks up what you just solved.
pub const TTL_SECS: u64 = 3_600;
/// Connected learners the cron reads per run; each costs one GraphQL subrequest, and
/// the free plan allows 50. shortcut: past ~300 connected learners a full lap takes over
/// a day; then run the cron hourly or fan out through a queue.
pub const POLL_BATCH: u32 = 40;
/// How long the cron keeps a solve waiting for the learner's next visit.
pub const KEEP_SECS: i64 = 30 * 86_400;
/// The learners to read next: connected ones, longest since their last check first.
pub const DUE_SQL: &str = "SELECT s.user_id AS user_id, json_extract(s.extra, '$.leetcode_username') AS username \
    FROM user_settings s LEFT JOIN leetcode_polls p ON p.user_id = s.user_id \
    WHERE json_extract(s.extra, '$.leetcode_username') IS NOT NULL \
    ORDER BY COALESCE(p.checked_at, 0) LIMIT ?1";
/// Free Render instances sleep, so a slow first answer is a reason to fall back.
pub const ALFA_TIMEOUT_SECS: u64 = 5;
/// Uncached lookups per IP per hour; cache hits are free.
pub const PER_IP_LIMIT: u32 = 30;
pub const RECENT_LIMIT: usize = 20;
const MAX_USERNAME_LEN: usize = 40;
const QUERY: &str = "query($u:String!){matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty count}} tagProblemCounts{advanced{tagName problemsSolved} intermediate{tagName problemsSolved} fundamental{tagName problemsSolved}}} recentAcSubmissionList(username:$u,limit:20){titleSlug timestamp}}";

/// LeetCode usernames are letters, digits, `_`, `-` and `.`.
pub fn valid_username(u: &str) -> bool {
    !u.is_empty()
        && u.len() <= MAX_USERNAME_LEN
        && u.bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.'))
}

pub fn cache_key(username: &str) -> String {
    format!("lc:v1:{}", username.to_ascii_lowercase())
}

pub fn graphql_body(username: &str) -> String {
    serde_json::json!({"query": QUERY, "variables": {"u": username}}).to_string()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Solved {
    pub all: u32,
    pub easy: u32,
    pub medium: u32,
    pub hard: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagCount {
    pub name: String,
    pub solved: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Recent {
    pub slug: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Profile {
    pub username: String,
    pub solved: Solved,
    pub tags: Vec<TagCount>,
    pub recent: Vec<Recent>,
}

/// Folds the cron's stored solves into a profile's recent list: newest first, one per
/// problem, so a week away from myleet still counts every solve, not only the last 20.
pub fn with_stored(mut p: Profile, stored: Vec<Recent>) -> Profile {
    p.recent.extend(stored);
    p.recent.sort_by_key(|r| std::cmp::Reverse(r.timestamp));
    let mut seen = std::collections::HashSet::new();
    p.recent.retain(|r| seen.insert(r.slug.clone()));
    p
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    Found(Profile),
    NotFound,
}

/// Anything but a found profile sends the request to the other source: alfa can be
/// asleep, rate limited or wrong about a missing user, and GraphQL is the authority.
pub fn needs_fallback(primary: &Result<Outcome, String>) -> bool {
    !matches!(primary, Ok(Outcome::Found(_)))
}

fn de_i64<'de, D: Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
    match Value::deserialize(d)? {
        Value::Number(n) => n.as_i64().ok_or_else(|| serde::de::Error::custom("number")),
        Value::String(s) => s.parse().map_err(serde::de::Error::custom),
        _ => Err(serde::de::Error::custom("timestamp")),
    }
}

#[derive(Deserialize)]
struct CountRow {
    difficulty: String,
    count: u32,
}

#[derive(Deserialize)]
struct TagRow {
    #[serde(rename = "tagName")]
    name: String,
    #[serde(rename = "problemsSolved")]
    solved: u32,
}

#[derive(Deserialize)]
struct RecentRow {
    #[serde(rename = "titleSlug")]
    slug: String,
    #[serde(deserialize_with = "de_i64")]
    timestamp: i64,
}

fn solved_of(rows: &[CountRow]) -> Solved {
    let n = |d: &str| {
        rows.iter()
            .find(|r| r.difficulty.eq_ignore_ascii_case(d))
            .map_or(0, |r| r.count)
    };
    Solved {
        all: n("All"),
        easy: n("Easy"),
        medium: n("Medium"),
        hard: n("Hard"),
    }
}

fn tags_of(rows: Vec<TagRow>) -> Vec<TagCount> {
    rows.into_iter()
        .map(|t| TagCount {
            name: t.name,
            solved: t.solved,
        })
        .collect()
}

fn recent_of(rows: Vec<RecentRow>) -> Vec<Recent> {
    rows.into_iter()
        .take(RECENT_LIMIT)
        .map(|r| Recent {
            slug: r.slug,
            timestamp: r.timestamp,
        })
        .collect()
}

#[derive(Deserialize)]
struct GqlReply {
    errors: Option<Vec<Value>>,
    data: Option<GqlData>,
}

#[derive(Deserialize)]
struct GqlData {
    #[serde(rename = "matchedUser")]
    user: Option<GqlUser>,
    #[serde(rename = "recentAcSubmissionList", default)]
    recent: Option<Vec<RecentRow>>,
}

#[derive(Deserialize)]
struct GqlUser {
    #[serde(rename = "submitStatsGlobal")]
    stats: GqlStats,
    #[serde(rename = "tagProblemCounts")]
    tags: GqlTags,
}

#[derive(Deserialize)]
struct GqlStats {
    #[serde(rename = "acSubmissionNum")]
    ac: Vec<CountRow>,
}

#[derive(Deserialize, Default)]
struct GqlTags {
    #[serde(default)]
    advanced: Vec<TagRow>,
    #[serde(default)]
    intermediate: Vec<TagRow>,
    #[serde(default)]
    fundamental: Vec<TagRow>,
}

impl GqlTags {
    fn all(self) -> Vec<TagRow> {
        [self.fundamental, self.intermediate, self.advanced]
            .into_iter()
            .flatten()
            .collect()
    }
}

/// `Err` is transient: do not cache it. `NotFound` is a missing user.
pub fn parse_graphql(username: &str, text: &str) -> Result<Outcome, String> {
    let reply: GqlReply = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let data = reply.data;
    let Some(data) = data else {
        return Err(match reply.errors {
            Some(e) => format!("leetcode: {}", e.first().unwrap_or(&Value::Null)),
            None => "leetcode: empty reply".to_string(),
        });
    };
    // GraphQL reports a missing user as a null user (with an error alongside).
    let Some(user) = data.user else {
        return Ok(Outcome::NotFound);
    };
    Ok(Outcome::Found(Profile {
        username: username.to_string(),
        solved: solved_of(&user.stats.ac),
        tags: tags_of(user.tags.all()),
        recent: recent_of(data.recent.unwrap_or_default()),
    }))
}

#[derive(Deserialize)]
struct AlfaSolved {
    #[serde(rename = "acSubmissionNum")]
    ac: Vec<CountRow>,
}

#[derive(Deserialize, Default)]
struct AlfaSkill {
    #[serde(default)]
    advanced: Vec<TagRow>,
    #[serde(default)]
    intermediate: Vec<TagRow>,
    #[serde(default)]
    fundamental: Vec<TagRow>,
}

#[derive(Deserialize)]
struct AlfaAc {
    #[serde(default)]
    submission: Vec<RecentRow>,
}

/// The three alfa-leetcode-api bodies for one user: `/solved`, `/skill` and
/// `/acSubmission?limit=20`. Any shape surprise is an `Err`, which means fall back.
pub fn parse_alfa(username: &str, solved: &str, skill: &str, ac: &str) -> Result<Outcome, String> {
    let s: AlfaSolved = serde_json::from_str(solved).map_err(|e| format!("alfa solved: {e}"))?;
    let k: AlfaSkill = serde_json::from_str(skill).map_err(|e| format!("alfa skill: {e}"))?;
    let a: AlfaAc = serde_json::from_str(ac).map_err(|e| format!("alfa acSubmission: {e}"))?;
    let tags = [k.fundamental, k.intermediate, k.advanced]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    Ok(Outcome::Found(Profile {
        username: username.to_string(),
        solved: solved_of(&s.ac),
        tags: tags_of(tags),
        recent: recent_of(a.submission),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    const GQL: &str = r#"{"data":{"matchedUser":{"submitStatsGlobal":{"acSubmissionNum":[
        {"difficulty":"All","count":205},{"difficulty":"Easy","count":103},
        {"difficulty":"Medium","count":98},{"difficulty":"Hard","count":4}]},
        "tagProblemCounts":{"advanced":[{"tagName":"Trie","problemsSolved":2}],
        "intermediate":[{"tagName":"Tree","problemsSolved":37}],
        "fundamental":[{"tagName":"Array","problemsSolved":80}]}},
        "recentAcSubmissionList":[{"titleSlug":"two-sum","timestamp":"1700000000"}]}}"#;
    const SOLVED: &str = r#"{"solvedProblem":205,"acSubmissionNum":[
        {"difficulty":"All","count":205,"submissions":349},{"difficulty":"Easy","count":103},
        {"difficulty":"Medium","count":98},{"difficulty":"Hard","count":4}]}"#;
    const SKILL: &str = r#"{"fundamental":[{"tagName":"Array","tagSlug":"array","problemsSolved":80}],
        "intermediate":[{"tagName":"Tree","problemsSolved":37}],
        "advanced":[{"tagName":"Trie","problemsSolved":2}]}"#;
    const AC: &str = r#"{"count":1,"submission":[{"title":"Two Sum","titleSlug":"two-sum","timestamp":"1700000000"}]}"#;

    #[test]
    fn usernames() {
        for ok in ["neetcode", "a.b-c_d", "X1"] {
            assert!(valid_username(ok), "{ok}");
        }
        for bad in ["", "a b", "a/b", "a?b=1", "né", &"x".repeat(41)] {
            assert!(!valid_username(bad), "{bad}");
        }
        assert_eq!(cache_key("NeetCode"), "lc:v1:neetcode");
    }

    #[test]
    fn both_sources_normalize_to_the_same_profile() {
        let g = parse_graphql("neetcode", GQL).unwrap();
        let a = parse_alfa("neetcode", SOLVED, SKILL, AC).unwrap();
        assert_eq!(g, a);
        let Outcome::Found(p) = g else { panic!() };
        assert_eq!((p.solved.all, p.solved.hard, p.tags.len()), (205, 4, 3));
        assert_eq!(p.recent[0].timestamp, 1_700_000_000);
    }

    #[test]
    fn a_missing_user_is_not_found_and_noise_is_an_error() {
        let missing = r#"{"errors":[{"message":"That user does not exist."}],"data":{"matchedUser":null,"recentAcSubmissionList":null}}"#;
        assert_eq!(parse_graphql("nobody", missing), Ok(Outcome::NotFound));
        assert!(parse_graphql("x", "<html>").is_err());
        assert!(parse_graphql("x", r#"{"errors":[{"message":"boom"}]}"#).is_err());
    }

    #[test]
    fn fallback_triggers_on_any_alfa_failure() {
        let alfa_down = parse_alfa("u", "404: Not Found", SKILL, AC);
        assert!(alfa_down.is_err() && needs_fallback(&alfa_down));
        assert!(needs_fallback(&Ok(Outcome::NotFound)));
        assert!(needs_fallback(&Err("timeout".into())));
        assert!(!needs_fallback(&parse_alfa("u", SOLVED, SKILL, AC)));
    }

    #[test]
    fn stored_solves_join_the_recent_list_once_each() {
        let mut p = parse_graphql("neetcode", GQL).unwrap();
        let Outcome::Found(ref mut p) = p else {
            panic!()
        };
        p.recent = vec![Recent {
            slug: "two-sum".into(),
            timestamp: 50,
        }];
        let stored = vec![
            Recent {
                slug: "two-sum".into(),
                timestamp: 10,
            },
            Recent {
                slug: "valid-anagram".into(),
                timestamp: 40,
            },
        ];
        let got: Vec<_> = with_stored(p.clone(), stored)
            .recent
            .into_iter()
            .map(|r| (r.slug, r.timestamp))
            .collect();
        assert_eq!(got, [("two-sum".into(), 50), ("valid-anagram".into(), 40)]);
    }
}
