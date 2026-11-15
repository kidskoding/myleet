use std::path::{Path, PathBuf};

use crate::config::Config;

/// Prefers the repo's .venv over `uv run`, which can resolve a python without pytest.
pub fn resolve_python(cfg: &Config, root: &Path) -> Result<Vec<String>, String> {
    resolve_python_from(cfg, root, &|key| std::env::var(key).ok())
}

pub fn resolve_python_from(
    cfg: &Config,
    root: &Path,
    env: &dyn Fn(&str) -> Option<String>,
) -> Result<Vec<String>, String> {
    let fields = |s: &str| s.split_whitespace().map(String::from).collect::<Vec<_>>();
    if !cfg.python.trim().is_empty() {
        return Ok(fields(&cfg.python));
    }
    if let Some(py) = env("MYLEET_PYTHON").filter(|v| !v.trim().is_empty()) {
        return Ok(fields(&py));
    }
    let venv = root.join(".venv").join("bin").join("python");
    if venv.exists() {
        return Ok(vec![venv.to_string_lossy().into_owned()]);
    }
    let path_var = env("PATH").unwrap_or_default();
    if let Some(uv) = look_path("uv", &path_var) {
        return Ok(vec![
            uv.to_string_lossy().into_owned(),
            "run".into(),
            "--project".into(),
            root.to_string_lossy().into_owned(),
            "python".into(),
        ]);
    }
    if let Some(py) = look_path("python3", &path_var) {
        return Ok(vec![py.to_string_lossy().into_owned()]);
    }
    Err(
        "no python found: run `uv sync` in the repo, or set python in ~/.config/myleet/config.toml"
            .to_string(),
    )
}

pub fn look_path(name: &str, path_var: &str) -> Option<PathBuf> {
    std::env::split_paths(path_var)
        .filter(|dir| !dir.as_os_str().is_empty())
        .flat_map(|dir| candidates(&dir, name))
        .find(|p| is_executable(p))
}

#[cfg(unix)]
fn candidates(dir: &Path, name: &str) -> Vec<PathBuf> {
    vec![dir.join(name)]
}

#[cfg(not(unix))]
fn candidates(dir: &Path, name: &str) -> Vec<PathBuf> {
    vec![dir.join(format!("{name}.exe")), dir.join(name)]
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path).is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
}

#[cfg(not(unix))]
fn is_executable(path: &Path) -> bool {
    path.is_file()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_python_prefers_config() {
        let root = tempfile::tempdir().unwrap();
        let mut cfg = Config {
            python: "/opt/py/bin/python3 -X dev".into(),
            ..Config::default()
        };
        let env = |k: &str| (k == "MYLEET_PYTHON").then(|| "/env/python".to_string());
        let got = resolve_python_from(&cfg, root.path(), &env).unwrap();
        assert_eq!(got.join(" "), "/opt/py/bin/python3 -X dev");
        cfg.python.clear();
        let got = resolve_python_from(&cfg, root.path(), &env).unwrap();
        assert_eq!(got.join(" "), "/env/python");
    }

    #[test]
    fn resolve_python_uses_repo_venv() {
        let root = tempfile::tempdir().unwrap();
        let venv = root.path().join(".venv/bin/python");
        std::fs::create_dir_all(venv.parent().unwrap()).unwrap();
        std::fs::write(&venv, "").unwrap();
        let got = resolve_python_from(&Config::default(), root.path(), &|_| None).unwrap();
        assert_eq!(got, vec![venv.to_string_lossy().into_owned()]);
    }

    #[test]
    fn resolve_python_none() {
        let root = tempfile::tempdir().unwrap();
        let empty = root.path().to_string_lossy().into_owned();
        let env = move |k: &str| (k == "PATH").then(|| empty.clone());
        assert!(resolve_python_from(&Config::default(), root.path(), &env).is_err());
    }
}
