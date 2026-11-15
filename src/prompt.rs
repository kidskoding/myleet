//! Caches LeetCode statements on the learner's machine only; they are copyrighted, so
//! they are never written into the repo.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Deserialize;

use crate::catalog::Problem;

pub const DEFAULT_ENDPOINT: &str = "https://leetcode.com/graphql";
const FETCH_TIMEOUT: Duration = Duration::from_secs(15);
const PREMIUM_SUFFIX: &str = ".premium";
const QUERY: &str =
    "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { isPaidOnly content } }";
const SLUG_PREFIX: &str = "leetcode.com/problems/";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Status {
    /// Prompt written in problem.toml.
    Authored,
    Cached,
    Fetched,
    /// LeetCode premium, statement not public.
    Premium,
    /// Fetch failed; try again later.
    Offline,
    /// Not a LeetCode problem, or unknown slug.
    NoSource,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Status::Authored => "authored",
            Status::Cached => "cached",
            Status::Fetched => "fetched",
            Status::Premium => "premium",
            Status::Offline => "offline",
            Status::NoSource => "no-source",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PromptResult {
    pub markdown: String,
    pub status: Status,
    pub err: Option<String>,
}

impl PromptResult {
    fn status(status: Status) -> PromptResult {
        PromptResult {
            markdown: String::new(),
            status,
            err: None,
        }
    }

    fn offline(err: String) -> PromptResult {
        PromptResult {
            err: Some(err),
            ..PromptResult::status(Status::Offline)
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Source {
    pub dir: PathBuf,
    /// Empty means [`DEFAULT_ENDPOINT`].
    pub endpoint: String,
}

pub fn slug(url: &str) -> &str {
    let mut rest = url;
    while let Some(i) = rest.find(SLUG_PREFIX) {
        rest = &rest[i + SLUG_PREFIX.len()..];
        let end = rest
            .find(|c: char| !(c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-'))
            .unwrap_or(rest.len());
        if end > 0 {
            return &rest[..end];
        }
    }
    ""
}

/// Uses the slug so a problem listed in several modules shares one file.
fn cache_key(p: &Problem) -> &str {
    match slug(&p.url) {
        "" => &p.id,
        s => s,
    }
}

struct Fetched {
    content: Option<String>,
    paid: bool,
}

impl Source {
    fn cache_path(&self, key: &str) -> PathBuf {
        self.dir.join(format!("{key}.md"))
    }

    pub fn get(&self, p: &Problem) -> PromptResult {
        if !p.prompt.trim().is_empty() {
            return PromptResult {
                markdown: p.prompt.clone(),
                ..PromptResult::status(Status::Authored)
            };
        }
        let key = cache_key(p);
        let path = self.cache_path(key);
        if let Some(data) = std::fs::read_to_string(&path)
            .ok()
            .filter(|d| !d.trim().is_empty())
        {
            return PromptResult {
                markdown: data,
                ..PromptResult::status(Status::Cached)
            };
        }
        let mut premium = path.clone().into_os_string();
        premium.push(PREMIUM_SUFFIX);
        if Path::new(&premium).exists() {
            return PromptResult::status(Status::Premium);
        }
        let slug = slug(&p.url);
        if slug.is_empty() {
            return PromptResult::status(Status::NoSource);
        }
        let question = match self.fetch(slug) {
            Err(e) => return PromptResult::offline(e),
            Ok(None) => return PromptResult::status(Status::NoSource),
            Ok(Some(q)) => q,
        };
        let content = question.content.unwrap_or_default();
        if content.is_empty() {
            if question.paid {
                let _ = self.write(&format!("{key}.md{PREMIUM_SUFFIX}"), "");
                return PromptResult::status(Status::Premium);
            }
            return PromptResult::status(Status::NoSource);
        }
        let md = match to_markdown(&content) {
            Ok(md) => md,
            Err(e) => return PromptResult::offline(e),
        };
        let _ = self.write(&format!("{key}.md"), &md);
        PromptResult {
            markdown: md,
            ..PromptResult::status(Status::Fetched)
        }
    }

    fn write(&self, name: &str, content: &str) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.dir)?;
        // Write then rename so an interrupted write never leaves a truncated statement.
        let mut tmp = tempfile::Builder::new()
            .prefix(".tmp-")
            .tempfile_in(&self.dir)?;
        tmp.write_all(content.as_bytes())?;
        tmp.persist(self.dir.join(name)).map_err(|e| e.error)?;
        Ok(())
    }

    /// `Ok(None)` means LeetCode has no question with this slug.
    fn fetch(&self, slug: &str) -> Result<Option<Fetched>, String> {
        let endpoint = if self.endpoint.is_empty() {
            DEFAULT_ENDPOINT
        } else {
            &self.endpoint
        };
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .timeout_global(Some(FETCH_TIMEOUT))
            .http_status_as_error(false)
            .build()
            .into();
        let body = serde_json::json!({"query": QUERY, "variables": {"titleSlug": slug}});
        let mut resp = agent
            .post(endpoint)
            .header("Content-Type", "application/json")
            .header("Referer", format!("https://leetcode.com/problems/{slug}/"))
            .header("User-Agent", "myleet (personal study tool)")
            .send(body.to_string())
            .map_err(|e| e.to_string())?;
        if resp.status() != ureq::http::StatusCode::OK {
            return Err(format!("leetcode returned {}", resp.status()));
        }
        let text = resp
            .body_mut()
            .read_to_string()
            .map_err(|e| e.to_string())?;
        let out: Reply = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        if let Some(e) = out.errors.unwrap_or_default().first() {
            return Err(format!("leetcode: {}", e.message));
        }
        Ok(out.data.and_then(|d| d.question).map(|q| Fetched {
            content: q.content,
            paid: q.is_paid_only,
        }))
    }
}

#[derive(Deserialize)]
struct Reply {
    errors: Option<Vec<GraphQLError>>,
    data: Option<Data>,
}

#[derive(Deserialize)]
struct GraphQLError {
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

/// Superscripts become ^n so 10<sup>4</sup> reads as 10^4 in a terminal.
pub fn to_markdown(html: &str) -> Result<String, String> {
    let html = replace_sup(html).replace("&nbsp;", " ");
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
    use crate::testutil::serve;
    use std::net::TcpListener;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    const KOKO_HTML: &str = r#"<p>Koko loves to eat bananas. There are <code>n</code> piles.</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> piles = [3,6,7,11], h = 8
<strong>Output:</strong> 4
</pre>
<ul><li><code>1 &lt;= piles.length &lt;= 10<sup>4</sup></code></li></ul>"#;
    const KOKO_URL: &str = "https://leetcode.com/problems/koko-eating-bananas/";

    fn leetcode(body: &str) -> String {
        let req: serde_json::Value = serde_json::from_str(body).unwrap_or_default();
        let question = match req["variables"]["titleSlug"].as_str() {
            Some("koko-eating-bananas") => {
                serde_json::json!({"isPaidOnly": false, "content": KOKO_HTML})
            }
            Some("meeting-rooms-ii") => serde_json::json!({"isPaidOnly": true, "content": null}),
            _ => serde_json::Value::Null,
        };
        serde_json::json!({"data": {"question": question}}).to_string()
    }

    fn source(calls: &Arc<AtomicUsize>) -> (Source, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let src = Source {
            dir: dir.path().to_path_buf(),
            endpoint: serve(calls.clone(), leetcode),
        };
        (src, dir)
    }

    fn problem(id: &str, url: &str, prompt: &str) -> Problem {
        let mut p = crate::workspace::test_problem(id, Path::new(""));
        p.url = url.into();
        p.prompt = prompt.into();
        p
    }

    #[test]
    fn fetch_converts_and_caches() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        let p = problem("koko-eating-bananas", KOKO_URL, "");
        let res = src.get(&p);
        assert_eq!(res.status, Status::Fetched, "{:?}", res.err);
        for want in [
            "Koko loves to eat bananas",
            "`n`",
            "Example 1",
            "piles = [3,6,7,11]",
            "10^4",
        ] {
            assert!(
                res.markdown.contains(want),
                "missing {want:?}:\n{}",
                res.markdown
            );
        }
        let again = src.get(&p);
        assert_eq!(again.status, Status::Cached);
        assert_eq!(again.markdown, res.markdown);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert!(
            src.dir.join("koko-eating-bananas.md").exists(),
            "cache file missing"
        );
    }

    #[test]
    fn premium_is_remembered_without_refetch() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        let p = problem(
            "meeting-rooms-ii",
            "https://leetcode.com/problems/meeting-rooms-ii/",
            "",
        );
        assert_eq!(src.get(&p).status, Status::Premium);
        assert_eq!(src.get(&p).status, Status::Premium);
        assert_eq!(calls.load(Ordering::SeqCst), 1, "premium refetched");
        assert!(src.dir.join("meeting-rooms-ii.md.premium").exists());
    }

    #[test]
    fn own_prompt_wins() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        let res = src.get(&problem("koko-eating-bananas", KOKO_URL, "Our own words."));
        assert_eq!(res.status, Status::Authored);
        assert_eq!(res.markdown, "Our own words.");
        assert_eq!(calls.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn offline_is_not_cached() {
        let addr = TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap();
        let dir = tempfile::tempdir().unwrap();
        let src = Source {
            dir: dir.path().to_path_buf(),
            endpoint: format!("http://{addr}/graphql"),
        };
        let res = src.get(&problem("koko-eating-bananas", KOKO_URL, ""));
        assert!(
            res.status == Status::Offline && res.err.is_some(),
            "{res:?}"
        );
        assert_eq!(
            std::fs::read_dir(dir.path()).unwrap().count(),
            0,
            "offline result must not be cached"
        );
    }

    #[test]
    fn not_on_leetcode() {
        let dir = tempfile::tempdir().unwrap();
        let src = Source {
            dir: dir.path().to_path_buf(),
            endpoint: "http://unused.invalid".into(),
        };
        let res = src.get(&problem("closest-pair-of-points", "", ""));
        assert_eq!(res.status, Status::NoSource);
    }

    #[test]
    fn unknown_slug() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        let res = src.get(&problem(
            "x",
            "https://leetcode.com/problems/does-not-exist/",
            "",
        ));
        assert_eq!(res.status, Status::NoSource);
    }

    #[test]
    fn empty_cache_file_is_refetched() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        std::fs::write(src.dir.join("koko-eating-bananas.md"), "").unwrap();
        let res = src.get(&problem("koko-eating-bananas", KOKO_URL, ""));
        assert_eq!(
            res.status,
            Status::Fetched,
            "an empty cache file must be treated as missing"
        );
    }

    #[test]
    fn graphql_error_is_offline() {
        let dir = tempfile::tempdir().unwrap();
        let src = Source {
            dir: dir.path().to_path_buf(),
            endpoint: serve(Arc::new(AtomicUsize::new(0)), |_| {
                r#"{"errors":[{"message":"rate limited"}],"data":{"question":null}}"#.into()
            }),
        };
        let res = src.get(&problem("koko-eating-bananas", KOKO_URL, ""));
        assert_eq!(res.status, Status::Offline);
        assert!(
            res.err
                .as_deref()
                .is_some_and(|e| e.contains("rate limited")),
            "{res:?}"
        );
    }

    #[test]
    fn cache_shared_across_duplicate_ids() {
        let calls = Arc::new(AtomicUsize::new(0));
        let (src, _d) = source(&calls);
        src.get(&problem("koko-eating-bananas", KOKO_URL, ""));
        let res = src.get(&problem("koko-eating-bananas-binary_search", KOKO_URL, ""));
        assert_eq!(
            res.status,
            Status::Cached,
            "the same LeetCode problem in another module must reuse the cache"
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn slug_parses_like_the_go_regex() {
        assert_eq!(slug(KOKO_URL), "koko-eating-bananas");
        assert_eq!(slug("https://leetcode.com/problems/two-sum"), "two-sum");
        assert_eq!(slug("https://leetcode.com/problems/"), "");
        assert_eq!(slug("https://example.com/x"), "");
    }

    #[test]
    fn markdown_collapses_blank_runs() {
        assert_eq!(collapse_blank_runs("a\n\n\n\nb\nc"), "a\n\nb\nc");
        assert_eq!(
            replace_sup("10<sup>4</sup> and 2<sup>31"),
            "10^4 and 2<sup>31"
        );
    }
}
