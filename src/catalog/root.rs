use std::path::{Path, PathBuf};

fn is_root(dir: &Path) -> bool {
    dir.join("curriculum").is_dir()
}

/// Walks up from `start` for a `curriculum/` directory, or honors `MYLEET_ROOT`.
pub fn find_root(start: &Path) -> Result<PathBuf, String> {
    find_root_with(
        start,
        std::env::var("MYLEET_ROOT").ok().filter(|v| !v.is_empty()),
    )
}

fn find_root_with(start: &Path, env_root: Option<String>) -> Result<PathBuf, String> {
    if let Some(root) = env_root {
        if !is_root(Path::new(&root)) {
            return Err(format!("MYLEET_ROOT={root} has no curriculum/ directory"));
        }
        return Ok(PathBuf::from(root));
    }
    let start = std::path::absolute(start).map_err(|e| e.to_string())?;
    start.ancestors().find(|d| is_root(d)).map(Path::to_path_buf).ok_or_else(|| {
        "no curriculum/ directory found; run myleet inside the repo, set MYLEET_ROOT, or let myleet install the curriculum".to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::find_root_with;
    use crate::catalog::testdata;

    #[test]
    fn walks_up_and_honors_env() {
        let good = testdata("good");
        let nested = good.join("curriculum/01_alpha/notes");
        assert_eq!(find_root_with(&nested, None).unwrap(), good);
        let outside = tempfile::tempdir().unwrap();
        let env = Some(good.to_string_lossy().into_owned());
        assert_eq!(find_root_with(outside.path(), env).unwrap(), good);
        assert!(find_root_with(&nested, Some("/elsewhere".into())).is_err());
        assert!(find_root_with(outside.path(), None).is_err());
    }
}
