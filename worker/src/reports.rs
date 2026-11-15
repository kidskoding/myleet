//! "I was asked this at <company>": learners' own interview reports. Counts are public
//! only once enough distinct people back them, so one report never points at a person.

use serde::{Deserialize, Serialize};

include!(concat!(env!("OUT_DIR"), "/companies.rs"));

const PROBLEM_IDS: &str = include_str!("../../problem-ids.lock");

/// A company's count shows only once this many distinct learners reported it.
pub const MIN_REPORTERS: u32 = 3;

/// Report writes per user per rate window (`magic::RATE_WINDOW_SECS`).
pub const PER_USER_LIMIT: u32 = 60;

pub fn valid_company(slug: &str) -> bool {
    COMPANIES.binary_search(&slug).is_ok()
}

pub fn valid_problem(id: &str) -> bool {
    !id.is_empty() && PROBLEM_IDS.lines().any(|l| l.trim() == id)
}

/// `YYYY-MM`, month 01 to 12.
pub fn valid_season(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 7
        && b[4] == b'-'
        && b[..4].iter().chain(&b[5..]).all(u8::is_ascii_digit)
        && matches!(s[5..].parse::<u8>(), Ok(1..=12))
        && &s[..4] >= "2000"
}

#[derive(Debug, Deserialize)]
pub struct Report {
    pub problem: String,
    pub company: String,
    #[serde(default)]
    pub season: Option<String>,
    /// `false` removes the learner's report.
    pub reported: bool,
}

/// The 400 message for a report the Worker refuses.
pub fn check(r: &Report) -> Result<(), &'static str> {
    if !valid_problem(&r.problem) {
        return Err("unknown problem");
    }
    if !valid_company(&r.company) {
        return Err("unknown company");
    }
    if r.season.as_deref().is_some_and(|s| !valid_season(s)) {
        return Err("season must be YYYY-MM");
    }
    Ok(())
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct CompanyCount {
    pub company: String,
    pub count: u32,
}

/// Drops companies under the threshold; most reported first, then by name.
pub fn public_counts(mut rows: Vec<CompanyCount>) -> Vec<CompanyCount> {
    rows.retain(|r| r.count >= MIN_REPORTERS);
    rows.sort_by(|a, b| {
        b.count
            .cmp(&a.count)
            .then_with(|| a.company.cmp(&b.company))
    });
    rows
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(company: &str, count: u32) -> CompanyCount {
        CompanyCount {
            company: company.into(),
            count,
        }
    }

    #[test]
    fn counts_hide_until_three_people() {
        let shown = public_counts(vec![
            row("meta", 2),
            row("google", 3),
            row("amazon", 7),
            row("uber", 1),
        ]);
        assert_eq!(shown, vec![row("amazon", 7), row("google", 3)]);
        assert!(public_counts(vec![row("google", MIN_REPORTERS - 1)]).is_empty());
    }

    #[test]
    fn companies_come_from_playlists() {
        assert!(COMPANIES.len() > 100);
        assert!(COMPANIES.windows(2).all(|w| w[0] < w[1]));
        assert!(valid_company("google") && valid_company("salesforce_slack"));
        assert!(!valid_company("001_google") && !valid_company("") && !valid_company("nope"));
    }

    #[test]
    fn seasons_and_problems() {
        assert!(valid_season("2026-01") && valid_season("2025-12"));
        for bad in [
            "2026-13", "2026-00", "2026-1", "26-01-01", "1999-05", "2026/01", "abcd-ef",
        ] {
            assert!(!valid_season(bad), "{bad}");
        }
        assert!(valid_problem("3sum") && !valid_problem("not-a-problem") && !valid_problem(""));
    }

    #[test]
    fn report_bodies() {
        let parse = |b: &str| {
            serde_json::from_str::<Report>(b)
                .map_err(|_| "bad json")
                .and_then(|r| check(&r).map(|()| r))
        };
        let r =
            parse(r#"{"problem":"3sum","company":"google","season":"2026-09","reported":true}"#)
                .unwrap();
        assert_eq!(
            (r.company.as_str(), r.season.as_deref()),
            ("google", Some("2026-09"))
        );
        assert!(parse(r#"{"problem":"3sum","company":"google","reported":false}"#).is_ok());
        assert_eq!(
            parse(r#"{"problem":"3sum","company":"not-a-company","reported":true}"#).unwrap_err(),
            "unknown company"
        );
        assert_eq!(
            parse(r#"{"problem":"nope","company":"google","reported":true}"#).unwrap_err(),
            "unknown problem"
        );
        assert_eq!(
            parse(r#"{"problem":"3sum","company":"google","season":"2026-9","reported":true}"#)
                .unwrap_err(),
            "season must be YYYY-MM"
        );
        assert!(parse("nope").is_err());
    }
}
