mod data;

use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};

pub use data::{
    CatalogData, EntryData, ModuleData, NoteData, PlaylistData, ProblemData, TechniqueData,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

impl Difficulty {
    pub fn parse(s: &str) -> Option<Difficulty> {
        match s {
            "easy" => Some(Difficulty::Easy),
            "medium" => Some(Difficulty::Medium),
            "hard" => Some(Difficulty::Hard),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Difficulty::Easy => "easy",
            Difficulty::Medium => "medium",
            Difficulty::Hard => "hard",
        }
    }

    pub fn short(self) -> &'static str {
        match self {
            Difficulty::Medium => "med",
            d => d.as_str(),
        }
    }

    /// Every problem gets 25 minutes, about what one problem gets in a live interview.
    pub fn default_time_target(self) -> Duration {
        let _ = self;
        Duration::from_secs(25 * 60)
    }
}

pub const DEFAULT_SAY_ALOUD: [&str; 3] = ["brute force", "why it dies", "complexity"];

/// Playlist groups in the order the playlists screen shows them.
pub const GROUPS: [&str; 5] = [
    "Big Tech",
    "AI & Startups",
    "Consumer and Business Tech",
    "Trading Firms",
    "Fortune 500",
];

#[derive(Debug)]
pub struct Module {
    pub id: String,
    pub title: String,
    pub description: String,
    pub dir: PathBuf,
    pub number: u64,
    /// Playlist-only trackable problems (not on the map).
    pub bank: bool,
    pub notes: Vec<Note>,
    pub techniques: Vec<Technique>,
}

#[derive(Debug)]
pub struct Technique {
    pub id: String,
    pub title: String,
    pub note: Option<PathBuf>,
    pub number: u64,
    /// Indices into `Catalog::problems`.
    pub problems: Vec<usize>,
}

#[derive(Debug, Clone)]
pub struct Problem {
    pub id: String,
    pub title: String,
    pub url: String,
    pub key_idea: String,
    pub prompt: String,
    pub dir: PathBuf,
    pub difficulty: Difficulty,
    pub leetcode: i64,
    pub hints: Vec<String>,
    pub say_aloud: Vec<String>,
    pub time_target: Duration,
    pub number: u64,
    pub order: usize,
    pub module: usize,
    pub technique: usize,
    pub has_solution: bool,
}

impl Problem {
    pub fn starter_path(&self) -> PathBuf {
        self.dir.join("starter.py")
    }
    pub fn test_path(&self) -> PathBuf {
        self.dir.join("test_problem.py")
    }
    pub fn solution_path(&self) -> PathBuf {
        self.dir.join("solution.py")
    }
}

#[derive(Debug)]
pub struct PlaylistEntry {
    pub title: String,
    pub url: String,
    pub problem: Option<usize>,
}

#[derive(Debug)]
pub struct Playlist {
    pub id: String,
    pub title: String,
    pub group: String,
    pub focus: String,
    pub entries: Vec<PlaylistEntry>,
}

/// A guide or module note.
#[derive(Debug)]
pub struct Note {
    pub title: String,
    pub path: PathBuf,
}

#[derive(Debug, Default)]
pub struct Catalog {
    pub root: PathBuf,
    pub guide: Vec<Note>,
    pub modules: Vec<Module>,
    pub playlists: Vec<Playlist>,
    problems: Vec<Problem>,
    by_id: HashMap<String, usize>,
}

impl Catalog {
    /// `problems[i].order` must be `i`; the first of any duplicate ids wins lookups.
    pub fn new(
        root: PathBuf,
        guide: Vec<Note>,
        modules: Vec<Module>,
        playlists: Vec<Playlist>,
        problems: Vec<Problem>,
    ) -> Catalog {
        let mut by_id = HashMap::with_capacity(problems.len());
        for (i, p) in problems.iter().enumerate() {
            by_id.entry(p.id.clone()).or_insert(i);
        }
        Catalog {
            root,
            guide,
            modules,
            playlists,
            problems,
            by_id,
        }
    }

    pub fn problem(&self, id: &str) -> Option<&Problem> {
        self.by_id.get(id).map(|&i| &self.problems[i])
    }

    pub fn problems(&self) -> &[Problem] {
        &self.problems
    }

    pub fn module_of(&self, p: &Problem) -> &Module {
        &self.modules[p.module]
    }

    pub fn technique_of(&self, p: &Problem) -> &Technique {
        &self.modules[p.module].techniques[p.technique]
    }

    pub fn curriculum(&self) -> impl Iterator<Item = &Problem> {
        self.problems
            .iter()
            .filter(|p| !self.modules[p.module].bank)
    }

    pub fn lib_dir(&self) -> PathBuf {
        self.root.join("curriculum").join("_lib")
    }

    pub fn ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.by_id.keys().cloned().collect();
        ids.sort();
        ids
    }
}

/// The LeetCode slug of a problem URL, or the URL itself without a trailing slash;
/// playlists match entries to problems by it.
pub fn slug_of(url: &str) -> String {
    const MARK: &str = "leetcode.com/problems/";
    if let Some(i) = url.find(MARK) {
        let slug: String = url[i + MARK.len()..]
            .chars()
            .take_while(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == '-')
            .collect();
        if !slug.is_empty() {
            return slug;
        }
    }
    url.trim_end_matches('/').to_string()
}

#[cfg(test)]
mod tests {
    use super::slug_of;

    #[test]
    fn slugs_ignore_trailing_slash() {
        assert_eq!(slug_of("https://leetcode.com/problems/two-sum/"), "two-sum");
        assert_eq!(slug_of("https://leetcode.com/problems/two-sum"), "two-sum");
        assert_eq!(slug_of("https://example.com/x//"), "https://example.com/x");
    }
}
