//! The "Why this one" line, built only from the learner's own data. Every fact is
//! optional and a clause whose data is missing is left out, so a new learner gets one
//! short sentence and someone with history gets two connected ones.

use crate::skills::{Cause, Level, Mark};

#[derive(Debug, Default, Clone)]
pub struct Facts {
    /// The technique, mid-sentence ("sliding window").
    pub tech: String,
    /// The last attempt on this problem: how it went and how many days ago.
    pub last: Option<(Mark, Option<Cause>, i64)>,
    /// Days until the next review after a clean pass now; `None` on the top rung.
    pub clean_days: Option<i64>,
    /// Already on the review ladder, so a clean pass moves it rather than starting it.
    pub on_ladder: bool,
    pub level: Option<Level>,
    /// The learner's weakest practised technique.
    pub weakest: bool,
    pub warmup: bool,
    /// Nothing attempted in this technique yet.
    pub first_in_tech: bool,
    /// A pinned company and how many of its problems sit in this technique.
    pub company: Option<(String, usize)>,
    /// Days until the next interview.
    pub days_left: Option<i64>,
    /// Difficulty word and the learner's median minutes for it.
    pub pace: Option<(String, u32)>,
}

fn ago(n: i64) -> String {
    match n {
        ..=0 => "earlier today".into(),
        1 => "yesterday".into(),
        n => format!("{n} days ago"),
    }
}

fn days(n: i64) -> String {
    if n == 1 {
        "1 day".into()
    } else {
        format!("{n} days")
    }
}

fn cap(s: &str) -> String {
    let mut cs = s.chars();
    cs.next()
        .map_or(String::new(), |c| c.to_uppercase().chain(cs).collect())
}

/// What the next level means to the learner, as a clause about `tech`.
fn outcome(l: Level, tech: &str) -> Option<String> {
    match l {
        Level::Shaky => Some(format!("you'll stop needing hints on {tech}")),
        Level::Building => Some(format!("{tech} will start to feel solid")),
        Level::Solid => Some(format!(
            "you'll handle {tech} under interview time pressure"
        )),
        Level::New | Level::Strong => None,
    }
}

/// What happened last time, as a clause: "you missed an edge case here yesterday".
fn last_clause(mark: Mark, cause: Option<Cause>, n: i64) -> String {
    let when = ago(n);
    match (mark, cause) {
        (Mark::Clean, _) => format!("you solved it cleanly {when}"),
        (Mark::Hint, _) => format!("you needed a hint here {when}"),
        (Mark::Over, _) => format!("you solved it {when} but ran past the time target"),
        (Mark::Missed, Some(Cause::EdgeCases)) => {
            format!("you got close {when} but missed an edge case")
        }
        (Mark::Missed, Some(Cause::WrongApproach)) => {
            format!("you started down the wrong approach here {when}")
        }
        (Mark::Missed, Some(Cause::TooSlow)) => {
            format!("you ran out of time on this one {when}")
        }
        (Mark::Missed, _) => format!("you got stuck on this one {when}"),
    }
}

/// A first sentence on why this problem, then one on the company, the interview and pace.
pub fn build(f: &Facts) -> String {
    let first = if let Some((mark, cause, n)) = f.last {
        let mut s = last_clause(mark, cause, n);
        if let Some(d) = f.clean_days {
            let again = if mark == Mark::Clean { "another" } else { "a" };
            let what = if f.on_ladder {
                format!("puts the next review {} out", days(d))
            } else {
                format!("puts its first review {} out", days(d))
            };
            s += &format!(", so {again} clean pass now {what}");
        }
        s
    } else if f.warmup && !f.first_in_tech {
        // A first read: two shaky attempts are not yet a weak spot.
        format!(
            "it's the easiest {} problem you haven't tried, a gentle way back in",
            f.tech
        )
    } else if let (true, Some(l)) = (f.weakest, f.level)
        && let Some(next) = outcome(l, &f.tech)
        && l <= Level::Building
    {
        format!(
            "{} is your weakest technique right now. Solve this one cleanly and {next}",
            f.tech
        )
    } else if f.first_in_tech {
        let gentle = if f.warmup {
            ", and it's the easiest one, so it's a gentle start"
        } else {
            ""
        };
        format!("this is your first {} problem{gentle}", f.tech)
    } else if let Some(l) = f.level.filter(|l| *l != Level::New) {
        let how = match l {
            Level::Shaky => "still feels shaky",
            Level::Building => "is coming along",
            Level::Solid => "is in good shape",
            _ => "is strong",
        };
        format!("your {} {how}, and this is the next problem in it", f.tech)
    } else {
        format!("this is next up in {}", f.tech)
    };

    let mut more: Vec<String> = Vec::new();
    let shows_up = |co: &str, n: usize| {
        let n = if n == 1 {
            "one".to_string()
        } else {
            n.to_string()
        };
        format!("{} shows up in {n} of {co}'s problems", f.tech)
    };
    match (&f.company, f.days_left.filter(|d| *d > 0)) {
        (Some((co, n)), Some(d)) => more.push(format!(
            "your interview is {} away and {}",
            days(d),
            shows_up(co, *n)
        )),
        (Some((co, n)), None) => more.push(shows_up(co, *n)),
        (None, Some(d)) if d <= NEAR_DAYS => {
            more.push(format!("your interview is {} away", days(d)))
        }
        _ => {}
    }
    if let Some((diff, m)) = &f.pace {
        more.push(format!("{diff}s usually take you about {m} minutes"));
    }

    let mut out = cap(&first);
    if !more.is_empty() {
        for m in &more {
            out += ". ";
            out += &cap(m);
        }
    }
    out.push('.');
    out
}

/// The clause for a problem the learner solved on LeetCode before ever opening it here.
pub fn leetcode_clause(days_ago: i64) -> String {
    let when = match days_ago {
        ..=0 => "today".to_string(),
        1 => "yesterday".to_string(),
        2..=13 => format!("{days_ago} days ago"),
        14..=59 => format!("{} weeks ago", days_ago / 7),
        _ => format!("{} months ago", days_ago / 30),
    };
    format!("you solved this on LeetCode {when}, so let's see if it stuck")
}

/// An interview this close is worth naming even without a company.
const NEAR_DAYS: i64 = 14;

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Facts {
        Facts {
            tech: "hashing".into(),
            ..Facts::default()
        }
    }

    #[test]
    fn leetcode_clause_reads_in_weeks() {
        assert_eq!(
            leetcode_clause(21),
            "you solved this on LeetCode 3 weeks ago, so let's see if it stuck"
        );
        assert!(leetcode_clause(1).contains("yesterday"));
    }

    #[test]
    fn no_history_is_short_and_about_you() {
        let f = Facts {
            first_in_tech: true,
            ..base()
        };
        assert_eq!(build(&f), "This is your first hashing problem.");
        let f = Facts {
            company: Some(("Meta".into(), 1)),
            ..f
        };
        assert_eq!(
            build(&f),
            "This is your first hashing problem. Hashing shows up in one of Meta's problems."
        );
    }

    #[test]
    fn a_hint_names_what_a_clean_pass_does() {
        let f = Facts {
            last: Some((Mark::Hint, None, 6)),
            clean_days: Some(14),
            on_ladder: true,
            ..base()
        };
        assert_eq!(
            build(&f),
            "You needed a hint here 6 days ago, so a clean pass now puts the next review 14 days out."
        );
    }

    #[test]
    fn a_near_miss_names_the_cause() {
        let f = Facts {
            last: Some((Mark::Missed, Some(Cause::EdgeCases), 1)),
            clean_days: Some(1),
            ..base()
        };
        assert_eq!(
            build(&f),
            "You got close yesterday but missed an edge case, so a clean pass now puts its first review 1 day out."
        );
    }

    #[test]
    fn a_weak_technique_names_the_next_level() {
        let f = Facts {
            tech: "sliding window".into(),
            level: Some(Level::Shaky),
            weakest: true,
            ..base()
        };
        assert_eq!(
            build(&f),
            "Sliding window is your weakest technique right now. Solve this one cleanly and you'll stop needing hints on sliding window."
        );
    }

    #[test]
    fn a_company_with_a_date_and_pace() {
        let f = Facts {
            level: Some(Level::Building),
            company: Some(("Meta".into(), 3)),
            days_left: Some(12),
            pace: Some(("medium".into(), 22)),
            ..base()
        };
        assert_eq!(
            build(&f),
            "Your hashing is coming along, and this is the next problem in it. Your interview is 12 days away and hashing shows up in 3 of Meta's problems. Mediums usually take you about 22 minutes."
        );
    }

    #[test]
    fn missing_data_leaves_clauses_out() {
        assert_eq!(build(&base()), "This is next up in hashing.");
        let f = Facts {
            pace: Some(("medium".into(), 22)),
            ..base()
        };
        assert_eq!(
            build(&f),
            "This is next up in hashing. Mediums usually take you about 22 minutes."
        );
        // A far interview with no company says nothing.
        let f = Facts {
            days_left: Some(60),
            ..base()
        };
        assert_eq!(build(&f), "This is next up in hashing.");
    }
}
