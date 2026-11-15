mod load;
mod lock;
mod root;

use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;

pub use load::{LoadError, load, note_title};
pub use lock::{LOCK_FILE, read_lock, write_lock};
pub use root::{
    CONTENT_DIR_NAME, DEFAULT_REPO, bootstrap_content, content_dir, ensure_root, ensure_root_with,
    find_root, find_root_with, root_kind, root_kind_with, sync_deps, update_content,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
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

    pub fn default_time_target(self) -> Duration {
        Duration::from_secs(match self {
            Difficulty::Easy => 15 * 60,
            Difficulty::Medium => 25 * 60,
            Difficulty::Hard => 45 * 60,
        })
    }
}

pub const DEFAULT_SAY_ALOUD: [&str; 3] = ["brute force", "why it dies", "complexity"];

/// Playlist groups in the order the playlists screen shows them.
pub const GROUPS: [&str; 5] = [
    "Big tech",
    "Little tech",
    "AI labs / high growth",
    "Quant",
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
    pub notes: Vec<PathBuf>,
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

#[derive(Debug)]
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

/// A start-here note that belongs to no module.
#[derive(Debug)]
pub struct GuideNote {
    pub title: String,
    pub path: PathBuf,
}

#[derive(Debug, Default)]
pub struct Catalog {
    pub root: PathBuf,
    pub guide: Vec<GuideNote>,
    pub modules: Vec<Module>,
    pub playlists: Vec<Playlist>,
    problems: Vec<Problem>,
    by_id: HashMap<String, usize>,
}

impl Catalog {
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

    /// Every problem outside the bank.
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

#[cfg(test)]
pub(crate) fn testdata(name: &str) -> PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("internal/catalog/testdata")
        .join(name)
}
