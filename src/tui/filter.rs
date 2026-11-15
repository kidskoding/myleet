//! The `/` list filter and the fuzzy matcher behind it and search. `find` is a
//! port of github.com/sahilm/fuzzy so ranks
//! and matched indexes (which search's `compact` check reads) stay the same.

use ratatui::text::{Line, Span};

use super::app::KeyPress;
use super::theme::Theme;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Match {
    pub index: usize,
    /// Byte offsets of the matched characters.
    pub matched: Vec<usize>,
    pub score: i64,
}

const FIRST_CHAR_BONUS: i64 = 10;
const SEPARATOR_BONUS: i64 = 20;
const CAMEL_BONUS: i64 = 20;
const ADJACENT_BONUS: i64 = 5;
const LEADING_PENALTY: i64 = -5;
const MAX_LEADING_PENALTY: i64 = -15;

fn eq_fold(a: char, b: char) -> bool {
    a == b || a.to_lowercase().eq(b.to_lowercase())
}

fn is_separator(c: char) -> bool {
    "/-_ .\\".contains(c)
}

/// Every string in data that contains pattern's characters in order, best first
/// (stable on ties), like `fuzzy.Find`.
pub fn find<S: AsRef<str>>(pattern: &str, data: &[S]) -> Vec<Match> {
    if pattern.is_empty() {
        return Vec::new();
    }
    let runes: Vec<char> = pattern.chars().collect();
    let mut out = Vec::new();
    for (index, s) in data.iter().enumerate() {
        let s = s.as_ref().split('\0').next().unwrap_or("");
        let chars: Vec<(usize, char)> = s.char_indices().collect();
        let mut matched: Vec<usize> = Vec::with_capacity(runes.len());
        let mut total = 0;
        let mut pi = 0;
        let mut best = -1;
        let mut best_at: Option<usize> = None;
        let mut adjacent = 0;
        let mut last = '\0';
        let mut last_index = 0;
        for (k, &(j, c)) in chars.iter().enumerate() {
            if runes.get(pi).is_some_and(|&r| eq_fold(c, r)) {
                let mut score = 0;
                if j == 0 {
                    score += FIRST_CHAR_BONUS;
                }
                if last.is_lowercase() && c.is_uppercase() {
                    score += CAMEL_BONUS;
                }
                if j != 0 && is_separator(last) {
                    score += SEPARATOR_BONUS;
                }
                if matched.last() == Some(&last_index) {
                    // Runs of adjacent matches grow their bonus as they lengthen.
                    let bonus = adjacent * 2 + ADJACENT_BONUS;
                    score += bonus;
                    adjacent += bonus;
                }
                if score > best {
                    best = score;
                    best_at = Some(j);
                }
            }
            let next_p = runes.get(pi + 1).copied().unwrap_or('\0');
            let next_c = chars.get(k + 1).map_or('\0', |&(_, c)| c);
            // A character's best position is fixed once the next pattern character
            // comes up (or the string ends), so later, better spots still win.
            if eq_fold(next_p, next_c) || next_c == '\0' {
                if let Some(at) = best_at.take() {
                    if matched.is_empty() {
                        best += (at as i64 * LEADING_PENALTY).max(MAX_LEADING_PENALTY);
                    }
                    total += best;
                    matched.push(at);
                    best = -1;
                    pi += 1;
                }
            }
            last_index = j;
            last = c;
        }
        total += matched.len() as i64 - s.len() as i64;
        if matched.len() == runes.len() {
            out.push(Match {
                index,
                matched,
                score: total,
            });
        }
    }
    out.sort_by_key(|m| std::cmp::Reverse(m.score));
    out
}

/// Narrows the list a screen shows while the user types after `/`. Cursors stay
/// indexes into the full list; the filter only decides which rows show.
#[derive(Clone, Debug, Default)]
pub struct ListFilter {
    pub on: bool,
    pub query: String,
}

impl ListFilter {
    pub fn start(&mut self) {
        self.on = true;
        self.query.clear();
    }

    pub fn stop(&mut self) {
        self.on = false;
        self.query.clear();
    }

    /// The keys that edit the query, so typing q or a digit never reaches the frame.
    pub fn owns(&self, k: &str) -> bool {
        self.on && (k == "esc" || k == "space" || k == "backspace" || k.chars().count() == 1)
    }

    /// Applies a query-editing key and reports whether it used it.
    pub fn edit(&mut self, k: &KeyPress) -> bool {
        if !self.on {
            return false;
        }
        match k.name.as_str() {
            "esc" => self.stop(),
            "backspace" => {
                self.query.pop();
            }
            "space" => self.query.push(' '),
            _ => match k.text() {
                Some(c) => self.query.push(c),
                None => return false,
            },
        }
        true
    }

    /// Indexes of labels to show, best match first while a query is typed.
    pub fn visible<S: AsRef<str>>(&self, labels: &[S]) -> Vec<usize> {
        if !self.on || self.query.is_empty() {
            return (0..labels.len()).collect();
        }
        find(&self.query, labels)
            .into_iter()
            .map(|m| m.index)
            .collect()
    }

    pub fn line(&self, th: &Theme) -> Line<'static> {
        Line::from(vec![
            Span::styled("/ ", th.accent),
            Span::raw(self.query.clone()),
            Span::styled("█", th.muted),
        ])
    }
}

pub fn settle(vis: &[usize], cur: usize) -> usize {
    if vis.is_empty() || vis.contains(&cur) {
        return cur;
    }
    vis[0]
}

pub fn step(vis: &[usize], cur: usize, d: isize) -> usize {
    if vis.is_empty() {
        return cur;
    }
    let pos = vis.iter().position(|&v| v == cur).unwrap_or(0) as isize;
    vis[(pos + d).clamp(0, vis.len() as isize - 1) as usize]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn press(k: &str) -> KeyPress {
        KeyPress::named(k)
    }

    /// (pattern, data, [(index, score, matched)]) as sahilm/fuzzy v0.1.3 returns them.
    #[allow(clippy::type_complexity)]
    const CASES: &[(&str, &[&str], &[(usize, i64, &[usize])])] = &[
        (
            "ab",
            &["ab", "a b", "xab"],
            &[(1, 29, &[0, 2]), (0, 15, &[0, 1]), (2, -1, &[1, 2])],
        ),
        (
            "tk",
            &["The Black Knight", "tk", "xxtk"],
            &[(0, 16, &[0, 10]), (1, 15, &[0, 1]), (2, -7, &[2, 3])],
        ),
        (
            "strp",
            &["Stripe", "String Problems", "Strip Paths"],
            &[
                (2, 43, &[0, 1, 2, 6]),
                (1, 39, &[0, 1, 2, 7]),
                (0, 28, &[0, 1, 2, 4]),
            ],
        ),
        (
            "p",
            &[
                "P One alpha",
                "Alpha One",
                "Stripe",
                "Logger Rate Limiter design",
            ],
            &[(0, 0, &[0]), (1, -18, &[2]), (2, -20, &[4])],
        ),
        (
            "fb",
            &["FooBar", "foobar"],
            &[(0, 26, &[0, 3]), (1, 6, &[0, 3])],
        ),
    ];

    #[test]
    fn find_matches_sahilm_fuzzy() {
        for (pattern, data, want) in CASES {
            let got: Vec<(usize, i64, Vec<usize>)> = find(pattern, data)
                .into_iter()
                .map(|m| (m.index, m.score, m.matched))
                .collect();
            let want: Vec<(usize, i64, Vec<usize>)> =
                want.iter().map(|&(i, s, m)| (i, s, m.to_vec())).collect();
            assert_eq!(got, want, "pattern {pattern:?}");
        }
        assert!(find("zz", &["ab"]).is_empty());
        assert!(find("", &["ab"]).is_empty());
    }

    #[test]
    fn filter_edits_and_owns_keys() {
        let mut f = ListFilter::default();
        assert!(!f.owns("q") && !f.edit(&press("a")));
        f.start();
        assert!(f.owns("q") && f.owns("1") && f.owns("esc") && !f.owns("enter"));
        for k in ["s", "t", "space", "r", "backspace"] {
            assert!(f.edit(&press(k)));
        }
        assert_eq!(f.query, "st ");
        assert!(!f.edit(&press("enter")), "enter is not a query key");
        assert_eq!(f.visible(&["Meta", "Stripe", "st x"]), [2]);
        f.query = "st".into();
        assert_eq!(f.visible(&["Meta", "Stripe", "st x"]), [2, 1]);
        assert!(f.edit(&press("esc")));
        assert!(!f.on && f.query.is_empty());
        assert_eq!(f.visible(&["a", "b"]), [0, 1]);
    }

    #[test]
    fn settle_and_step() {
        assert_eq!(settle(&[2, 4], 4), 4);
        assert_eq!(settle(&[2, 4], 3), 2);
        assert_eq!(settle(&[], 3), 3);
        assert_eq!(step(&[2, 4, 6], 4, 1), 6);
        assert_eq!(step(&[2, 4, 6], 6, 1), 6);
        assert_eq!(step(&[2, 4, 6], 2, -1), 2);
        assert_eq!(
            step(&[2, 4, 6], 5, 1),
            4,
            "off the list starts at the first match"
        );
        assert_eq!(step(&[], 5, 1), 5);
    }
}
