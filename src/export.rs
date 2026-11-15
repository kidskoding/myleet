//! `myleet export`: the JSON and file copies the web app loads.

use std::collections::BTreeSet;
use std::fs;
use std::io;
use std::path::Path;

use serde::Serialize;

use crate::catalog::Catalog;

const CATALOG_FILE: &str = "catalog.json";
/// Subdirectories the export owns; they are replaced on every run.
const OWNED_DIRS: [&str; 3] = ["problems", "notes", "lib"];

#[derive(Serialize)]
struct ProblemFiles {
    id: String,
    prompt: String,
    starter: String,
    test: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    solution: Option<String>,
}

#[derive(Debug, PartialEq)]
pub struct Summary {
    pub problems: usize,
    pub notes: usize,
    pub lib: usize,
}

fn pretty<T: Serialize>(v: &T) -> io::Result<String> {
    Ok(serde_json::to_string_pretty(v)? + "\n")
}

fn read(path: &Path) -> io::Result<String> {
    fs::read_to_string(path)
        .map_err(|e| io::Error::new(e.kind(), format!("{}: {e}", path.display())))
}

/// Writes `catalog.json`, `problems/<id>.json`, `notes/<path>` and `lib/*.py` under `out`.
pub fn export(c: &Catalog, out: &Path) -> io::Result<Summary> {
    // Replacing the owned dirs is only safe in a dir that is empty or already an export.
    let has_entries = fs::read_dir(out).is_ok_and(|mut d| d.next().is_some());
    if has_entries && !out.join(CATALOG_FILE).exists() {
        return Err(io::Error::other(format!(
            "{} is not empty and holds no {CATALOG_FILE}; pick an empty dir",
            out.display()
        )));
    }
    for dir in OWNED_DIRS {
        match fs::remove_dir_all(out.join(dir)) {
            Err(e) if e.kind() != io::ErrorKind::NotFound => return Err(e),
            _ => {}
        }
    }
    let data = c.to_data();
    fs::create_dir_all(out.join("problems"))?;
    fs::write(out.join(CATALOG_FILE), pretty(&data)?)?;

    for p in c.problems() {
        if p.id.is_empty() || p.id.contains(['/', '\\']) || p.id.starts_with('.') {
            return Err(io::Error::other(format!(
                "problem id {:?} is not a file name",
                p.id
            )));
        }
        let files = ProblemFiles {
            id: p.id.clone(),
            prompt: p.prompt.clone(),
            starter: read(&p.starter_path())?,
            test: read(&p.test_path())?,
            solution: p
                .has_solution
                .then(|| read(&p.solution_path()))
                .transpose()?,
        };
        fs::write(
            out.join("problems").join(format!("{}.json", p.id)),
            pretty(&files)?,
        )?;
    }

    let notes: BTreeSet<&str> = data
        .guide
        .iter()
        .chain(data.modules.iter().flat_map(|m| &m.notes))
        .map(|n| n.path.as_str())
        .chain(
            data.modules
                .iter()
                .flat_map(|m| &m.techniques)
                .filter_map(|t| t.note.as_deref()),
        )
        .collect();
    for rel in &notes {
        let to = out.join("notes").join(rel);
        if let Some(dir) = to.parent() {
            fs::create_dir_all(dir)?;
        }
        fs::write(to, read(&c.root.join(rel))?)?;
    }

    let lib_out = out.join("lib");
    fs::create_dir_all(&lib_out)?;
    let mut lib: Vec<_> = fs::read_dir(c.lib_dir())
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.is_file() && p.extension().is_some_and(|e| e == "py"))
        .collect();
    lib.sort();
    for f in &lib {
        if let Some(name) = f.file_name() {
            fs::write(lib_out.join(name), read(f)?)?;
        }
    }

    Ok(Summary {
        problems: c.problems().len(),
        notes: notes.len(),
        lib: lib.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalog::{load, testdata};

    #[test]
    fn good_fixture_exports_the_committed_json() {
        let c = load(&testdata("good")).unwrap();
        let dir = tempfile::tempdir().unwrap();
        let out = dir.path().join("data");
        let sum = export(&c, &out).unwrap();
        assert_eq!(
            sum,
            Summary {
                problems: 5,
                notes: 2,
                lib: 0
            }
        );
        // crates/core tests load this file, so it must match a fresh export.
        let want = fs::read_to_string(testdata("good.json")).unwrap();
        assert_eq!(fs::read_to_string(out.join(CATALOG_FILE)).unwrap(), want);

        let two: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(out.join("problems/two-sum.json")).unwrap())
                .unwrap();
        assert!(two["starter"].as_str().is_some_and(|s| !s.is_empty()));
        assert!(two.get("solution").is_none());
        let one = fs::read_to_string(out.join("problems/p-one.json")).unwrap();
        assert!(one.contains("\"solution\""));
        assert!(
            out.join("notes/curriculum/01_alpha/notes/01_a.md")
                .is_file()
        );

        // A rerun replaces the owned dirs and drops stale files.
        fs::write(out.join("problems/stale.json"), "{}").unwrap();
        export(&c, &out).unwrap();
        assert!(!out.join("problems/stale.json").exists());
    }

    #[test]
    fn refuses_a_foreign_non_empty_dir() {
        let c = load(&testdata("good")).unwrap();
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("keep.txt"), "mine").unwrap();
        assert!(export(&c, dir.path()).is_err());
        assert!(dir.path().join("keep.txt").exists());
    }
}
