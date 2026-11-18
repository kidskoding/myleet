//! LeetCode statements, fetched through the Worker and cached in KV. They are
//! copyrighted, so they are never committed; the Worker only relays them.

use serde::{Deserialize, Serialize};

pub const ENDPOINT: &str = "https://leetcode.com/graphql";
const QUERY: &str =
    "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { isPaidOnly content } }";
const MAX_SLUG_LEN: usize = 100;
const DAY_SECS: u64 = 86_400;
const FETCHED_TTL_SECS: u64 = 90 * DAY_SECS;
const PREMIUM_TTL_SECS: u64 = 90 * DAY_SECS;
// Short so a brand-new LeetCode problem shows up within a week.
const NONE_TTL_SECS: u64 = 7 * DAY_SECS;

/// Matches the slugs `src/prompt.rs` extracts from problem URLs.
pub fn valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= MAX_SLUG_LEN
        && slug
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

pub fn request_body(slug: &str) -> String {
    serde_json::json!({"query": QUERY, "variables": {"titleSlug": slug}}).to_string()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Fetched,
    /// LeetCode premium: the statement is not public.
    Premium,
    /// No question with this slug, or it has no content.
    None,
}

/// The KV value for one slug.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Cached {
    pub kind: Kind,
    #[serde(default)]
    pub markdown: String,
}

impl Cached {
    fn of(kind: Kind) -> Cached {
        Cached {
            kind,
            markdown: String::new(),
        }
    }

    pub fn ttl_secs(&self) -> u64 {
        match self.kind {
            Kind::Fetched => FETCHED_TTL_SECS,
            Kind::Premium => PREMIUM_TTL_SECS,
            Kind::None => NONE_TTL_SECS,
        }
    }

    /// The `status` field the API returns.
    pub fn status(&self, from_cache: bool) -> &'static str {
        match (self.kind, from_cache) {
            (Kind::Fetched, false) => "fetched",
            (Kind::Fetched, true) => "cached",
            (Kind::Premium, _) => "premium",
            (Kind::None, _) => "none",
        }
    }
}

pub const OFFLINE: &str = "offline";

#[derive(Deserialize)]
struct Reply {
    errors: Option<Vec<GraphQlError>>,
    data: Option<Data>,
}

#[derive(Deserialize)]
struct GraphQlError {
    #[serde(default)]
    message: String,
}

#[derive(Deserialize)]
struct Data {
    question: Option<Question>,
}

#[derive(Deserialize)]
struct Question {
    #[serde(rename = "isPaidOnly", default)]
    is_paid_only: bool,
    content: Option<String>,
}

/// `Err` is a transient failure: report offline and do not cache it.
pub fn parse_reply(text: &str) -> Result<Cached, String> {
    let reply: Reply = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if let Some(e) = reply.errors.unwrap_or_default().first() {
        return Err(format!("leetcode: {}", e.message));
    }
    let Some(question) = reply.data.and_then(|d| d.question) else {
        return Ok(Cached::of(Kind::None));
    };
    let content = question.content.unwrap_or_default();
    if content.trim().is_empty() {
        let kind = if question.is_paid_only {
            Kind::Premium
        } else {
            Kind::None
        };
        return Ok(Cached::of(kind));
    }
    Ok(Cached {
        kind: Kind::Fetched,
        markdown: to_markdown(&content)?,
    })
}

// Kept in step with `to_markdown` in src/prompt.rs so the CLI and web read alike.
/// Superscripts become ^n so 10<sup>4</sup> reads as 10^4.
pub fn to_markdown(html: &str) -> Result<String, String> {
    let html = myleet_core::statement::examples_as_code(&replace_sup(html)).replace("&nbsp;", " ");
    let md = htmd::convert(&html).map_err(|e| e.to_string())?;
    let md = collapse_blank_runs(md.trim());
    if md.is_empty() {
        return Err("empty statement".to_string());
    }
    Ok(md + "\n")
}

fn replace_sup(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(i) = rest.find("<sup>") {
        let after = &rest[i + "<sup>".len()..];
        let Some(j) = after.find("</sup>") else {
            break;
        };
        out.push_str(&rest[..i]);
        out.push('^');
        out.push_str(&after[..j]);
        rest = &after[j + "</sup>".len()..];
    }
    out.push_str(rest);
    out
}

fn collapse_blank_runs(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut newlines = 0;
    for c in s.chars() {
        newlines = if c == '\n' { newlines + 1 } else { 0 };
        if newlines <= 2 {
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const KOKO_HTML: &str = r#"<p>Koko loves to eat bananas. There are <code>n</code> piles.</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> piles = [3,6,7,11], h = 8
<strong>Output:</strong> 4
</pre>
<ul><li><code>1 &lt;= piles.length &lt;= 10<sup>4</sup></code></li></ul>"#;

    fn reply(question: serde_json::Value) -> String {
        serde_json::json!({"data": {"question": question}}).to_string()
    }

    #[test]
    fn fetched_statement_converts() {
        let got = parse_reply(&reply(
            serde_json::json!({"isPaidOnly": false, "content": KOKO_HTML}),
        ))
        .unwrap();
        assert_eq!(got.kind, Kind::Fetched);
        for want in [
            "Koko loves to eat bananas",
            "`n`",
            "Example 1",
            "**Input:** `piles = [3,6,7,11], h = 8`",
            "**Output:** `4`",
            "10^4",
        ] {
            assert!(
                got.markdown.contains(want),
                "missing {want:?}:\n{}",
                got.markdown
            );
        }
        assert_eq!(got.status(false), "fetched");
        assert_eq!(got.status(true), "cached");
    }

    #[test]
    fn premium_detected() {
        let got = parse_reply(&reply(
            serde_json::json!({"isPaidOnly": true, "content": null}),
        ))
        .unwrap();
        assert_eq!(got, Cached::of(Kind::Premium));
        assert_eq!(got.status(true), "premium");
        assert_eq!(got.ttl_secs(), PREMIUM_TTL_SECS);
    }

    #[test]
    fn unknown_slug_and_empty_content_are_none() {
        assert_eq!(
            parse_reply(&reply(serde_json::Value::Null)).unwrap().kind,
            Kind::None
        );
        let empty = parse_reply(&reply(
            serde_json::json!({"isPaidOnly": false, "content": " "}),
        ))
        .unwrap();
        assert_eq!(empty.kind, Kind::None);
        assert_eq!(empty.ttl_secs(), NONE_TTL_SECS);
    }

    #[test]
    fn graphql_errors_and_garbage_are_transient() {
        let err =
            parse_reply(r#"{"errors":[{"message":"rate limited"}],"data":{"question":null}}"#)
                .unwrap_err();
        assert!(err.contains("rate limited"), "{err}");
        assert!(parse_reply("<html>blocked</html>").is_err());
    }

    #[test]
    fn cached_value_round_trips() {
        let c = Cached {
            kind: Kind::Fetched,
            markdown: "# x\n".into(),
        };
        let json = serde_json::to_string(&c).unwrap();
        assert_eq!(json, r##"{"kind":"fetched","markdown":"# x\n"}"##);
        assert_eq!(serde_json::from_str::<Cached>(&json).unwrap(), c);
    }

    #[test]
    fn slug_validation() {
        assert!(valid_slug("koko-eating-bananas"));
        assert!(valid_slug("3sum"));
        for bad in ["", "Two-Sum", "a/b", "a b", "../x", "x\u{e9}"] {
            assert!(!valid_slug(bad), "{bad:?}");
        }
        assert!(!valid_slug(&"a".repeat(MAX_SLUG_LEN + 1)));
    }

    #[test]
    fn request_body_matches_cli_query() {
        let body: serde_json::Value = serde_json::from_str(&request_body("two-sum")).unwrap();
        assert_eq!(body["variables"]["titleSlug"], "two-sum");
        assert!(
            body["query"]
                .as_str()
                .unwrap()
                .contains("isPaidOnly content")
        );
    }

    #[test]
    fn markdown_helpers() {
        assert_eq!(collapse_blank_runs("a\n\n\n\nb\nc"), "a\n\nb\nc");
        assert_eq!(
            replace_sup("10<sup>4</sup> and 2<sup>31"),
            "10^4 and 2<sup>31"
        );
        assert!(to_markdown("<p> </p>").is_err());
    }
}
