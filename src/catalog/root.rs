use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::runner::look_path;

pub const DEFAULT_REPO: &str = "https://github.com/kidskoding/myleet.git";
pub const CONTENT_DIR_NAME: &str = "content";

fn is_root(dir: &Path) -> bool {
    dir.join("curriculum").is_dir()
}

fn env_root() -> Option<String> {
    std::env::var("MYLEET_ROOT").ok().filter(|v| !v.is_empty())
}

pub fn content_dir(data_dir: &Path) -> PathBuf {
    data_dir.join(CONTENT_DIR_NAME)
}

/// Walks up from `start` for a `curriculum/` directory, or honors `MYLEET_ROOT`.
pub fn find_root(start: &Path) -> Result<PathBuf, String> {
    find_root_with(start, env_root())
}

pub fn find_root_with(start: &Path, env_root: Option<String>) -> Result<PathBuf, String> {
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

/// Finds the curriculum, falling back to a clone under `<data>/content`. For the
/// installed copy it also ensures a python env (uv sync) so tests work with no
/// manual setup.
pub fn ensure_root(start: &Path, data_dir: &Path, warn: &mut dyn Write) -> Result<PathBuf, String> {
    ensure_root_with(start, data_dir, env_root(), warn)
}

pub fn ensure_root_with(
    start: &Path,
    data_dir: &Path,
    env_root: Option<String>,
    warn: &mut dyn Write,
) -> Result<PathBuf, String> {
    let explicit = env_root.is_some();
    match find_root_with(start, env_root) {
        Ok(root) => return Ok(root), // local checkout: leave the venv to the developer
        Err(e) if explicit => return Err(e), // an explicit root must not be replaced by a clone
        Err(_) => {}
    }
    let content = content_dir(data_dir);
    if !is_root(&content) {
        let _ = writeln!(
            warn,
            "myleet: no local curriculum found; cloning into {}",
            content.display()
        );
        bootstrap_content(&content, DEFAULT_REPO).map_err(|e| {
            format!("install curriculum: {e}\nfix: clone https://github.com/kidskoding/myleet and run from that directory, or set MYLEET_ROOT")
        })?;
    }
    if let Err(e) = ensure_venv(&content, warn) {
        let _ = writeln!(warn, "myleet: {e}");
        let _ = writeln!(
            warn,
            "myleet: install uv (https://docs.astral.sh/uv/), then re-run myleet"
        );
    }
    Ok(content)
}

fn ensure_venv(root: &Path, warn: &mut dyn Write) -> Result<(), String> {
    if root.join(".venv/bin/python").exists() || !root.join("pyproject.toml").exists() {
        return Ok(()); // already set up, or an incomplete tree (tests)
    }
    sync_deps(root, warn)
}

fn path_var() -> String {
    std::env::var("PATH").unwrap_or_default()
}

/// Child output goes to stderr so stdout stays clean for the command's own report.
fn run_to_stderr(cmd: &mut Command) -> Result<(), String> {
    let status = cmd
        .stdout(Stdio::from(std::io::stderr()))
        .stderr(Stdio::inherit())
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(status.to_string())
    }
}

pub fn sync_deps(root: &Path, warn: &mut dyn Write) -> Result<(), String> {
    let uv = look_path("uv", &path_var()).ok_or("uv is required for problem tests")?;
    let _ = writeln!(warn, "myleet: setting up python env...");
    run_to_stderr(Command::new(uv).arg("sync").arg("--directory").arg(root))
        .map_err(|e| format!("uv sync failed: {e}"))
}

/// Shallow-clones `repo_url` into `dest` via `<dest>.partial`, so an interrupted
/// clone never looks like a finished one.
pub fn bootstrap_content(dest: &Path, repo_url: &str) -> Result<(), String> {
    if is_root(dest) {
        return Ok(());
    }
    if look_path("git", &path_var()).is_none() {
        return Err("git is required to download the curriculum".into());
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut tmp = dest.as_os_str().to_owned();
    tmp.push(".partial");
    let tmp = PathBuf::from(tmp);
    let _ = std::fs::remove_dir_all(&tmp);
    let cloned = run_to_stderr(
        Command::new("git")
            .args(["clone", "--depth", "1", "--single-branch", repo_url])
            .arg(&tmp),
    )
    .and_then(|()| std::fs::rename(&tmp, dest).map_err(|e| e.to_string()));
    if cloned.is_err() {
        let _ = std::fs::remove_dir_all(&tmp);
    }
    cloned
}

pub fn update_content(content: &Path) -> Result<(), String> {
    if !is_root(content) {
        return Err(format!(
            "{} is not a myleet curriculum checkout",
            content.display()
        ));
    }
    run_to_stderr(
        Command::new("git")
            .arg("-C")
            .arg(content)
            .args(["pull", "--ff-only"]),
    )
}

pub fn root_kind(root: &Path, data_dir: &Path) -> &'static str {
    root_kind_with(root, data_dir, env_root())
}

pub fn root_kind_with(root: &Path, data_dir: &Path, env_root: Option<String>) -> &'static str {
    if env_root.is_some_and(|env| same_path(Path::new(&env), root)) {
        return "MYLEET_ROOT";
    }
    if same_path(root, &content_dir(data_dir)) {
        return "installed content";
    }
    "local checkout"
}

fn same_path(a: &Path, b: &Path) -> bool {
    let abs = |p: &Path| std::path::absolute(p).unwrap_or_else(|_| p.to_path_buf());
    let (a, b) = (abs(a), abs(b));
    a == b || a.to_string_lossy().to_lowercase() == b.to_string_lossy().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;
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

    #[test]
    fn ensure_root_uses_installed_content() {
        let data = tempfile::tempdir().unwrap();
        let content = content_dir(data.path());
        std::fs::create_dir_all(content.join("curriculum")).unwrap();
        let outside = tempfile::tempdir().unwrap();
        let root =
            ensure_root_with(outside.path(), data.path(), None, &mut std::io::sink()).unwrap();
        assert_eq!(root, content);
    }

    #[test]
    fn explicit_root_is_never_replaced_by_a_clone() {
        let data = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(content_dir(data.path()).join("curriculum")).unwrap();
        let outside = tempfile::tempdir().unwrap();
        let env = Some("/elsewhere".to_string());
        assert!(ensure_root_with(outside.path(), data.path(), env, &mut std::io::sink()).is_err());
    }

    #[test]
    fn root_kinds() {
        let data = Path::new("/data/myleet");
        let content = content_dir(data);
        assert_eq!(root_kind_with(&content, data, None), "installed content");
        assert_eq!(
            root_kind_with(Path::new("/repo"), data, Some("/repo".into())),
            "MYLEET_ROOT"
        );
        assert_eq!(
            root_kind_with(Path::new("/repo"), data, None),
            "local checkout"
        );
    }
}
