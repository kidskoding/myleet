//! The serializable catalog: what `myleet export` writes as `catalog.json` and what
//! the browser loads. Paths are relative to the content root, `/`-separated.

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::{Catalog, Difficulty, Module, Note, Playlist, PlaylistEntry, Problem, Technique};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CatalogData {
    pub guide: Vec<NoteData>,
    pub modules: Vec<ModuleData>,
    pub problems: Vec<ProblemData>,
    pub playlists: Vec<PlaylistData>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NoteData {
    pub title: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleData {
    pub id: String,
    pub title: String,
    pub description: String,
    pub number: u64,
    pub bank: bool,
    pub dir: String,
    pub notes: Vec<NoteData>,
    pub techniques: Vec<TechniqueData>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TechniqueData {
    pub id: String,
    pub title: String,
    pub number: u64,
    pub note: Option<String>,
    /// Indices into `problems`.
    pub problems: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProblemData {
    pub id: String,
    pub title: String,
    pub difficulty: Difficulty,
    pub url: String,
    pub leetcode: i64,
    pub hints: Vec<String>,
    pub key_idea: String,
    pub say_aloud: Vec<String>,
    // shortcut: whole seconds; a sub-second time_target would round down, none exist.
    pub time_target_secs: u64,
    pub number: u64,
    pub module: usize,
    pub technique: usize,
    pub has_solution: bool,
    pub dir: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlaylistData {
    pub id: String,
    pub title: String,
    pub group: String,
    pub focus: String,
    pub entries: Vec<EntryData>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntryData {
    pub title: String,
    pub url: String,
    /// Index into `problems` when the entry is a tracked problem.
    pub problem: Option<usize>,
}

fn rel(root: &Path, path: &Path) -> String {
    let p = path.strip_prefix(root).unwrap_or(path);
    p.components()
        .map(|c| c.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

fn note_data(root: &Path, n: &Note) -> NoteData {
    NoteData {
        title: n.title.clone(),
        path: rel(root, &n.path),
    }
}

fn note(root: &Path, n: NoteData) -> Note {
    Note {
        title: n.title,
        path: root.join(n.path),
    }
}

impl Catalog {
    /// Problem prompts are left out; the export writes them per problem.
    pub fn to_data(&self) -> CatalogData {
        let root = self.root.as_path();
        CatalogData {
            guide: self.guide.iter().map(|n| note_data(root, n)).collect(),
            modules: self
                .modules
                .iter()
                .map(|m| ModuleData {
                    id: m.id.clone(),
                    title: m.title.clone(),
                    description: m.description.clone(),
                    number: m.number,
                    bank: m.bank,
                    dir: rel(root, &m.dir),
                    notes: m.notes.iter().map(|n| note_data(root, n)).collect(),
                    techniques: m
                        .techniques
                        .iter()
                        .map(|t| TechniqueData {
                            id: t.id.clone(),
                            title: t.title.clone(),
                            number: t.number,
                            note: t.note.as_deref().map(|n| rel(root, n)),
                            problems: t.problems.clone(),
                        })
                        .collect(),
                })
                .collect(),
            problems: self
                .problems
                .iter()
                .map(|p| ProblemData {
                    id: p.id.clone(),
                    title: p.title.clone(),
                    difficulty: p.difficulty,
                    url: p.url.clone(),
                    leetcode: p.leetcode,
                    hints: p.hints.clone(),
                    key_idea: p.key_idea.clone(),
                    say_aloud: p.say_aloud.clone(),
                    time_target_secs: p.time_target.as_secs(),
                    number: p.number,
                    module: p.module,
                    technique: p.technique,
                    has_solution: p.has_solution,
                    dir: rel(root, &p.dir),
                })
                .collect(),
            playlists: self
                .playlists
                .iter()
                .map(|pl| PlaylistData {
                    id: pl.id.clone(),
                    title: pl.title.clone(),
                    group: pl.group.clone(),
                    focus: pl.focus.clone(),
                    entries: pl
                        .entries
                        .iter()
                        .map(|e| EntryData {
                            title: e.title.clone(),
                            url: e.url.clone(),
                            problem: e.problem,
                        })
                        .collect(),
                })
                .collect(),
        }
    }

    /// Rejects out-of-range indices so a bad file is an error, not a later panic.
    pub fn from_data(d: CatalogData, root: PathBuf) -> Result<Catalog, String> {
        let n = d.problems.len();
        let bad = |what: String| Err(format!("catalog: {what} is out of range"));
        for (i, p) in d.problems.iter().enumerate() {
            let techniques = d.modules.get(p.module).map(|m| m.techniques.len());
            if techniques.is_none_or(|t| p.technique >= t) {
                return bad(format!("problem {i} ({}) module/technique", p.id));
            }
        }
        for m in &d.modules {
            for t in &m.techniques {
                if t.problems.iter().any(|&i| i >= n) {
                    return bad(format!("technique {}/{} problem index", m.id, t.id));
                }
            }
        }
        for pl in &d.playlists {
            if pl.entries.iter().any(|e| e.problem.is_some_and(|i| i >= n)) {
                return bad(format!("playlist {} problem index", pl.id));
            }
        }
        let problems = d
            .problems
            .into_iter()
            .enumerate()
            .map(|(order, p)| Problem {
                id: p.id,
                title: p.title,
                url: p.url,
                key_idea: p.key_idea,
                prompt: String::new(),
                dir: root.join(p.dir),
                difficulty: p.difficulty,
                leetcode: p.leetcode,
                hints: p.hints,
                say_aloud: p.say_aloud,
                time_target: Duration::from_secs(p.time_target_secs),
                number: p.number,
                order,
                module: p.module,
                technique: p.technique,
                has_solution: p.has_solution,
            })
            .collect();
        let modules = d
            .modules
            .into_iter()
            .map(|m| Module {
                id: m.id,
                title: m.title,
                description: m.description,
                dir: root.join(m.dir),
                number: m.number,
                bank: m.bank,
                notes: m.notes.into_iter().map(|n| note(&root, n)).collect(),
                techniques: m
                    .techniques
                    .into_iter()
                    .map(|t| Technique {
                        id: t.id,
                        title: t.title,
                        note: t.note.map(|n| root.join(n)),
                        number: t.number,
                        problems: t.problems,
                    })
                    .collect(),
            })
            .collect();
        let playlists = d
            .playlists
            .into_iter()
            .map(|pl| Playlist {
                id: pl.id,
                title: pl.title,
                group: pl.group,
                focus: pl.focus,
                entries: pl
                    .entries
                    .into_iter()
                    .map(|e| PlaylistEntry {
                        title: e.title,
                        url: e.url,
                        problem: e.problem,
                    })
                    .collect(),
            })
            .collect();
        let guide = d.guide.into_iter().map(|n| note(&root, n)).collect();
        Ok(Catalog::new(root, guide, modules, playlists, problems))
    }

    pub fn from_json(json: &str, root: PathBuf) -> Result<Catalog, String> {
        let d = serde_json::from_str(json).map_err(|e| format!("catalog: {e}"))?;
        Catalog::from_data(d, root)
    }
}

#[cfg(test)]
mod tests {
    use crate::testutil::{GOOD_JSON, good_catalog};

    use super::*;

    #[test]
    fn json_round_trips() {
        let c = good_catalog();
        let again = serde_json::to_string_pretty(&c.to_data()).unwrap() + "\n";
        assert_eq!(again, GOOD_JSON);
        assert_eq!(c.problem("two-sum").map(|p| p.order), Some(3));
    }

    #[test]
    fn bad_indices_are_errors() {
        let mut d = good_catalog().to_data();
        d.problems[0].technique = 99;
        assert!(Catalog::from_data(d, PathBuf::new()).is_err());
        let mut d = good_catalog().to_data();
        d.playlists[0].entries[0].problem = Some(999);
        assert!(Catalog::from_data(d, PathBuf::new()).is_err());
    }
}
