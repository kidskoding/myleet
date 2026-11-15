use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Deserialize;

use crate::godur;

#[derive(Debug, Clone, PartialEq)]
pub struct Config {
    pub python: String,
    pub editor: String,
    pub timeout: Duration,
    pub new_per_day: u32,
    /// Where progress.toml and events.jsonl live; empty means the data dir.
    pub state_dir: String,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            python: String::new(),
            editor: String::new(),
            timeout: Duration::from_secs(10),
            new_per_day: 3,
            state_dir: String::new(),
        }
    }
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct FileConfig {
    python: String,
    editor: String,
    timeout: String,
    new_per_day: i64,
    state_dir: String,
}

/// Looks up an environment variable; threaded through so tests never mutate process env.
pub type Env<'a> = &'a dyn Fn(&str) -> Option<String>;

pub fn system_env(key: &str) -> Option<String> {
    std::env::var(key).ok()
}

pub fn load() -> Result<Config, String> {
    load_with(&system_env)
}

pub fn load_with(env: Env) -> Result<Config, String> {
    match std::fs::read_to_string(path_with(env)) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Config::default()),
        Err(e) => Err(e.to_string()),
        Ok(text) => parse(&text),
    }
}

pub fn load_file(path: &Path) -> Result<Config, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    parse(&text)
}

fn parse(text: &str) -> Result<Config, String> {
    let raw: FileConfig = toml::from_str(text).map_err(|e| e.to_string())?;
    let mut c = Config {
        python: raw.python,
        editor: raw.editor,
        state_dir: raw.state_dir,
        ..Config::default()
    };
    if !raw.timeout.is_empty() {
        let timeout = godur::parse(&raw.timeout).map_err(|e| format!("timeout: {e}"))?;
        if !timeout.is_zero() {
            c.timeout = timeout;
        }
    }
    if raw.new_per_day > 0 {
        c.new_per_day =
            u32::try_from(raw.new_per_day).map_err(|_| "new_per_day is too large".to_string())?;
    }
    Ok(c)
}

impl Config {
    /// `state_dir` from the config with `~` expanded, else the data dir.
    pub fn state_dir_path(&self) -> PathBuf {
        self.state_dir_path_with(&system_env)
    }

    pub fn state_dir_path_with(&self, env: Env) -> PathBuf {
        if self.state_dir.is_empty() {
            return data_dir_with(env);
        }
        expand_home(&self.state_dir, home(env))
    }
}

pub fn path() -> PathBuf {
    path_with(&system_env)
}

pub fn path_with(env: Env) -> PathBuf {
    xdg(var(env, "XDG_CONFIG_HOME"), home(env), ".config")
        .join("myleet")
        .join("config.toml")
}

pub fn data_dir() -> PathBuf {
    data_dir_with(&system_env)
}

pub fn data_dir_with(env: Env) -> PathBuf {
    xdg(var(env, "XDG_DATA_HOME"), home(env), ".local/share").join("myleet")
}

fn var(env: Env, key: &str) -> Option<String> {
    env(key).filter(|v| !v.is_empty())
}

fn home(env: Env) -> Option<PathBuf> {
    var(env, "HOME")
        .or_else(|| var(env, "USERPROFILE"))
        .map(PathBuf::from)
}

fn xdg(value: Option<String>, home: Option<PathBuf>, fallback: &str) -> PathBuf {
    match value {
        Some(dir) => PathBuf::from(dir),
        None => home.unwrap_or_else(|| PathBuf::from(".")).join(fallback),
    }
}

fn expand_home(dir: &str, home: Option<PathBuf>) -> PathBuf {
    match (dir.strip_prefix('~'), home) {
        (Some(rest), Some(home)) if rest.is_empty() || rest.starts_with('/') => {
            home.join(rest.trim_start_matches('/'))
        }
        _ => PathBuf::from(dir),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults() {
        let c = Config::default();
        assert_eq!(c.timeout, Duration::from_secs(10));
        assert_eq!(c.new_per_day, 3);
    }

    #[test]
    fn load_file_overrides_set_fields_only() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "timeout = \"20s\"\nnew_per_day = 5\n").unwrap();
        let c = load_file(&path).unwrap();
        assert_eq!(c.timeout, Duration::from_secs(20));
        assert_eq!(c.new_per_day, 5);
        assert_eq!((c.python.as_str(), c.editor.as_str()), ("", ""));
    }

    #[test]
    fn bad_timeout_is_an_error() {
        assert!(
            parse("timeout = \"soon\"\n")
                .unwrap_err()
                .contains("timeout")
        );
    }

    #[test]
    fn zero_or_missing_values_keep_defaults() {
        assert_eq!(parse("new_per_day = 0\n").unwrap(), Config::default());
        assert_eq!(parse("").unwrap(), Config::default());
    }

    #[test]
    fn xdg_wins_then_home_fallback() {
        let home = Some(PathBuf::from("/home/u"));
        assert_eq!(
            xdg(Some("/x".into()), home.clone(), ".config"),
            PathBuf::from("/x")
        );
        assert_eq!(xdg(None, home, ".config"), PathBuf::from("/home/u/.config"));
        assert_eq!(xdg(None, None, ".config"), PathBuf::from("./.config"));
    }

    #[test]
    fn state_dir_expands_home() {
        let home = Some(PathBuf::from("/home/u"));
        assert_eq!(
            expand_home("~/prog", home.clone()),
            PathBuf::from("/home/u/prog")
        );
        assert_eq!(expand_home("~", home.clone()), PathBuf::from("/home/u"));
        assert_eq!(expand_home("/abs", home), PathBuf::from("/abs"));
    }

    #[test]
    fn empty_state_dir_is_data_dir() {
        assert_eq!(Config::default().state_dir_path(), data_dir());
    }
}
