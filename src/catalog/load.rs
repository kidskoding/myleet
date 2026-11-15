use std::collections::HashMap;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use serde::de::DeserializeOwned;

use super::{
    Catalog, DEFAULT_SAY_ALOUD, Difficulty, GROUPS, Module, Note, Playlist, PlaylistEntry, Problem,
    Technique, slug_of,
};
use crate::godur;

#[derive(Deserialize, Default)]
#[serde(default)]
struct ModuleFile {
    title: String,
    description: String,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct TechniqueFile {
    title: String,
    note: String,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct ProblemFile {
    id: String,
    title: String,
    difficulty: String,
    leetcode: i64,
    url: String,
    key_idea: String,
    hints: Vec<String>,
    prompt: String,
    time_target: String,
    say_aloud: Vec<String>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct PlaylistFile {
    title: String,
    group: String,
    focus: String,
    entries: Vec<EntryFile>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct EntryFile {
    title: String,
    url: String,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct BankFile {
    title: String,
}

/// Every problem found while loading, one `path: message` line each.
#[derive(Debug)]
pub struct LoadError(pub Vec<String>);

impl fmt::Display for LoadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0.join("\n"))
    }
}

impl std::error::Error for LoadError {}

struct NumberedDir {
    number: u64,
    id: String,
    path: PathBuf,
}

/// Splits `NN_name` (`^(\d+)_(.+)$`) into its number and name.
fn split_numbered(name: &str) -> Option<(u64, &str)> {
    let (digits, rest) = name.split_once('_')?;
    if digits.is_empty() || rest.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    Some((digits.parse().unwrap_or(0), rest))
}

fn list_numbered(dir: &Path) -> std::io::Result<Vec<NumberedDir>> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if !entry.file_type()?.is_dir() {
            continue;
        }
        if let Some((number, id)) = split_numbered(&name) {
            out.push(NumberedDir {
                number,
                id: id.to_string(),
                path: entry.path(),
            });
        }
    }
    out.sort_by(|a, b| a.number.cmp(&b.number).then_with(|| a.path.cmp(&b.path)));
    Ok(out)
}

fn decode<T: DeserializeOwned>(path: &Path) -> Result<T, String> {
    let text = fs::read_to_string(path).map_err(|e| format!("open {}: {e}", path.display()))?;
    toml::from_str(&text).map_err(|e| e.message().to_string())
}

fn sorted_files(dir: &Path, ext: &str) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|e| e == ext))
        .collect();
    files.sort();
    files
}

struct Loader<'a> {
    root: &'a Path,
    errs: Vec<String>,
    modules: Vec<Module>,
    problems: Vec<Problem>,
    by_id: HashMap<String, usize>,
    playlists: Vec<Playlist>,
}

impl Loader<'_> {
    fn report(&mut self, path: &Path, msg: impl fmt::Display) {
        let rel = path.strip_prefix(self.root).unwrap_or(path);
        self.errs.push(format!("{}: {msg}", rel.display()));
    }

    fn load_techniques(&mut self, mut module: Module, dir: &Path) {
        let index = self.modules.len();
        for td in list_numbered(dir).unwrap_or_default() {
            let tf: TechniqueFile = match decode(&td.path.join("technique.toml")) {
                Ok(tf) => tf,
                Err(e) => {
                    self.report(&td.path, format_args!("technique.toml: {e}"));
                    continue;
                }
            };
            let mut tech = Technique {
                id: td.id,
                title: tf.title,
                note: None,
                number: td.number,
                problems: Vec::new(),
            };
            if !tf.note.is_empty() {
                let note = module.dir.join(&tf.note);
                if !note.exists() {
                    self.report(&td.path, format_args!("note {} does not exist", tf.note));
                }
                tech.note = Some(note);
            }
            for pd in list_numbered(&td.path).unwrap_or_default() {
                let Some(mut p) = self.load_problem(&pd) else {
                    continue;
                };
                if let Some(&prev) = self.by_id.get(&p.id) {
                    let prev_dir = self.problems[prev].dir.display().to_string();
                    self.report(
                        &pd.path,
                        format_args!("duplicate id {:?} (also {prev_dir})", p.id),
                    );
                    continue;
                }
                p.module = index;
                p.technique = module.techniques.len();
                p.order = self.problems.len();
                self.by_id.insert(p.id.clone(), p.order);
                tech.problems.push(p.order);
                self.problems.push(p);
            }
            module.techniques.push(tech);
        }
        self.modules.push(module);
    }

    fn load_problem(&mut self, pd: &NumberedDir) -> Option<Problem> {
        let pf: ProblemFile = match decode(&pd.path.join("problem.toml")) {
            Ok(pf) => pf,
            Err(e) => {
                self.report(&pd.path, format_args!("problem.toml: {e}"));
                return None;
            }
        };
        let mut ok = true;
        if pf.id.is_empty() {
            self.report(&pd.path, "missing id");
            ok = false;
        }
        let difficulty = Difficulty::parse(&pf.difficulty);
        if difficulty.is_none() {
            self.report(
                &pd.path,
                format_args!("invalid difficulty {:?}", pf.difficulty),
            );
            ok = false;
        }
        for name in ["starter.py", "test_problem.py"] {
            if !pd.path.join(name).exists() {
                self.report(&pd.path, format_args!("missing {name}"));
                ok = false;
            }
        }
        let mut target = difficulty
            .map(Difficulty::default_time_target)
            .unwrap_or_default();
        if !pf.time_target.is_empty() {
            match godur::parse(&pf.time_target) {
                Ok(d) => target = d,
                Err(e) => {
                    self.report(&pd.path, format_args!("time_target: {e}"));
                    ok = false;
                }
            }
        }
        let difficulty = difficulty.filter(|_| ok)?;
        let say_aloud = if pf.say_aloud.is_empty() {
            DEFAULT_SAY_ALOUD.iter().map(|s| s.to_string()).collect()
        } else {
            pf.say_aloud
        };
        Some(Problem {
            id: pf.id,
            title: pf.title,
            url: pf.url,
            key_idea: pf.key_idea,
            prompt: pf.prompt,
            has_solution: pd.path.join("solution.py").exists(),
            dir: pd.path.clone(),
            difficulty,
            leetcode: pf.leetcode,
            hints: pf.hints,
            say_aloud,
            time_target: target,
            number: pd.number,
            order: 0,
            module: 0,
            technique: 0,
        })
    }

    fn load_bank(&mut self, dir: &Path) {
        let path = dir.join("bank.toml");
        if !path.exists() {
            return;
        }
        let bf: BankFile = match decode(&path) {
            Ok(bf) => bf,
            Err(e) => return self.report(dir, format_args!("bank.toml: {e}")),
        };
        let bank = Module {
            id: "bank".into(),
            title: bf.title,
            description: String::new(),
            dir: dir.to_path_buf(),
            number: 1 << 20,
            bank: true,
            notes: Vec::new(),
            techniques: Vec::new(),
        };
        self.load_techniques(bank, dir);
    }

    fn load_playlists(&mut self) {
        let mut by_slug: HashMap<String, usize> = HashMap::new();
        for p in &self.problems {
            if !p.url.is_empty() {
                by_slug.entry(slug_of(&p.url)).or_insert(p.order);
            }
        }
        let mut out = Vec::new();
        for f in sorted_files(&self.root.join("playlists"), "toml") {
            let pf: PlaylistFile = match decode(&f) {
                Ok(pf) => pf,
                Err(e) => {
                    self.report(&f, e);
                    continue;
                }
            };
            if !GROUPS.contains(&pf.group.as_str()) {
                self.report(
                    &f,
                    format_args!("group {:?} is not one of {}", pf.group, GROUPS.join(", ")),
                );
                continue;
            }
            let entries = pf
                .entries
                .into_iter()
                .map(|e| PlaylistEntry {
                    problem: by_slug.get(&slug_of(&e.url)).copied(),
                    title: e.title,
                    url: e.url,
                })
                .collect();
            out.push(Playlist {
                id: f
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
                title: pf.title,
                group: pf.group,
                focus: pf.focus,
                entries,
            });
        }
        out.sort_by_key(|pl| GROUPS.iter().position(|g| *g == pl.group));
        self.playlists = out;
    }
}

fn notes_in(dir: &Path) -> Vec<Note> {
    sorted_files(dir, "md")
        .into_iter()
        .map(|f| Note {
            title: note_title(&f),
            path: f,
        })
        .collect()
}

fn load_guide(dir: &Path) -> Vec<Note> {
    sorted_files(dir, "md")
        .into_iter()
        .filter(|f| {
            f.file_stem()
                .and_then(|s| s.to_str())
                .and_then(split_numbered)
                .is_some()
        })
        .map(|f| Note {
            title: note_title(&f),
            path: f,
        })
        .collect()
}

pub fn note_title(path: &Path) -> String {
    if let Ok(text) = fs::read_to_string(path) {
        if let Some(title) = text.lines().find_map(|l| l.strip_prefix("# ")) {
            return title.trim().to_string();
        }
    }
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let id = split_numbered(&stem).map_or(stem.as_ref(), |(_, id)| id);
    id.split('_')
        .map(|w| {
            let mut c = w.chars();
            c.next()
                .map_or(String::new(), |f| f.to_uppercase().chain(c).collect())
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn load(root: &Path) -> Result<Catalog, LoadError> {
    let modules = list_numbered(&root.join("curriculum"))
        .map_err(|e| LoadError(vec![format!("read curriculum: {e}")]))?;
    let mut l = Loader {
        root,
        errs: Vec::new(),
        modules: Vec::new(),
        problems: Vec::new(),
        by_id: HashMap::new(),
        playlists: Vec::new(),
    };
    for md in modules {
        let mf: ModuleFile = match decode(&md.path.join("module.toml")) {
            Ok(mf) => mf,
            Err(e) => {
                l.report(&md.path, format_args!("module.toml: {e}"));
                continue;
            }
        };
        let module = Module {
            id: md.id,
            title: mf.title,
            description: mf.description,
            notes: notes_in(&md.path.join("notes")),
            number: md.number,
            bank: false,
            techniques: Vec::new(),
            dir: md.path.clone(),
        };
        l.load_techniques(module, &md.path.join("techniques"));
    }
    l.load_bank(&root.join("bank"));
    let guide = load_guide(&root.join("guide"));
    l.load_playlists();
    if l.errs.is_empty() {
        Ok(Catalog::new(
            root.to_path_buf(),
            guide,
            l.modules,
            l.playlists,
            l.problems,
        ))
    } else {
        Err(LoadError(l.errs))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::testdata;
    use std::time::Duration;

    fn good() -> Catalog {
        load(&testdata("good")).expect("load good")
    }

    #[test]
    fn loads_good_in_order() {
        let c = good();
        let ids: Vec<&str> = c.problems().iter().map(|p| p.id.as_str()).collect();
        assert_eq!(
            ids,
            [
                "p-one",
                "p-two",
                "p-three",
                "two-sum",
                "logger-rate-limiter"
            ]
        );
        for (i, p) in c.problems().iter().enumerate() {
            assert_eq!(p.order, i, "{}", p.id);
        }
        let one = c.problem("p-one").unwrap();
        assert_eq!(one.time_target, Duration::from_secs(15 * 60));
        assert_eq!(one.difficulty, Difficulty::Easy);
        assert!(one.has_solution);
        assert_eq!(
            (one.hints[0].as_str(), one.key_idea.as_str()),
            ("use +", "add them")
        );
        assert_eq!(one.say_aloud, DEFAULT_SAY_ALOUD);
        let two = c.problem("p-two").unwrap();
        assert_eq!(two.time_target, Duration::from_secs(20 * 60));
        assert!(!two.has_solution);
        assert_eq!(two.say_aloud[0], "invariant");
        let three = c.problem("p-three").unwrap();
        assert_eq!(three.time_target, Duration::from_secs(45 * 60));
        let (tech, module) = (c.technique_of(one), c.module_of(one));
        assert_eq!(
            (
                tech.title.as_str(),
                module.title.as_str(),
                module.id.as_str()
            ),
            ("One", "Alpha", "alpha")
        );
        assert!(
            tech.note
                .as_ref()
                .unwrap()
                .ends_with("01_alpha/notes/01_a.md")
        );
        assert!(c.technique_of(three).note.is_none());
        assert_eq!(module.notes.len(), 2);
        assert!(one.starter_path().ends_with("001_p_one/starter.py"));
        assert!(one.test_path().ends_with("test_problem.py"));
        assert!(c.lib_dir().ends_with("curriculum/_lib"));
        assert_eq!(c.curriculum().count(), 4);
    }

    #[test]
    fn bad_reports_every_error() {
        let err = load(&testdata("bad")).unwrap_err().to_string();
        for want in [
            "duplicate id \"dup\"",
            "test_problem.py",
            "invalid difficulty \"brutal\"",
        ] {
            assert!(err.contains(want), "missing {want:?} in:\n{err}");
        }
    }

    #[test]
    fn playlists_resolve_by_slug() {
        let c = good();
        assert_eq!(c.playlists.len(), 2);
        let pl = &c.playlists[0];
        assert_eq!(
            (pl.id.as_str(), pl.title.as_str(), pl.focus.as_str()),
            ("01_meta", "Meta", "speed")
        );
        assert_eq!(c.problems()[pl.entries[0].problem.unwrap()].id, "two-sum");
        assert!(pl.entries[1].problem.is_none());
    }

    #[test]
    fn numbered_names() {
        assert_eq!(split_numbered("01_alpha"), Some((1, "alpha")));
        assert_eq!(split_numbered("1_2_x"), Some((1, "2_x")));
        for bad in ["_lib", "alpha", "01_", "0a_x"] {
            assert_eq!(split_numbered(bad), None, "{bad}");
        }
    }

    #[test]
    fn note_title_falls_back_to_file_name() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("03_time_and_space.md");
        fs::write(&path, "no heading here\n").unwrap();
        assert_eq!(note_title(&path), "Time And Space");
        fs::write(&path, "intro\n# Big O \n").unwrap();
        assert_eq!(note_title(&path), "Big O");
    }

    #[test]
    fn loads_real_curriculum_with_every_locked_id() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let c = load(root).unwrap_or_else(|e| panic!("{e}"));
        assert!(c.problems().len() > 700);
        for id in crate::catalog::read_lock(root).unwrap().unwrap_or_default() {
            assert!(c.problem(&id).is_some(), "locked id {id} missing");
        }
    }

    #[test]
    fn default_slots_resolve_against_curriculum() {
        use crate::placement::{DEFAULT_SLOTS, resolve};
        let Ok(c) = load(Path::new(env!("CARGO_MANIFEST_DIR"))) else {
            return;
        };
        assert_eq!(resolve(&c, DEFAULT_SLOTS).len(), DEFAULT_SLOTS.len());
    }
}
