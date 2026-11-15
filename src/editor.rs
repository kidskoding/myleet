use std::path::Path;
use std::process::Command;

use crate::config::Config;
use crate::runner::look_path;

pub fn command(cfg: &Config, path: &Path) -> Result<Command, String> {
    command_from(cfg, path, &|key| std::env::var(key).ok())
}

fn command_from(
    cfg: &Config,
    path: &Path,
    env: &dyn Fn(&str) -> Option<String>,
) -> Result<Command, String> {
    let candidates = [
        cfg.editor.clone(),
        env("VISUAL").unwrap_or_default(),
        env("EDITOR").unwrap_or_default(),
    ];
    for candidate in &candidates {
        let mut fields = candidate.split_whitespace();
        if let Some(bin) = fields.next() {
            let mut cmd = Command::new(bin);
            cmd.args(fields).arg(path);
            return Ok(cmd);
        }
    }
    let path_var = env("PATH").unwrap_or_default();
    for name in ["nvim", "vim", "vi", "nano"] {
        if let Some(bin) = look_path(name, &path_var) {
            let mut cmd = Command::new(bin);
            cmd.arg(path);
            return Ok(cmd);
        }
    }
    Err("no editor found: set $EDITOR or editor in ~/.config/myleet/config.toml".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn args(cfg: &Config, env: &HashMap<&str, &str>) -> Result<String, String> {
        let cmd = command_from(cfg, Path::new("/w/attempt.py"), &|k| {
            env.get(k).map(|v| v.to_string())
        })?;
        let mut parts = vec![cmd.get_program().to_string_lossy().into_owned()];
        parts.extend(cmd.get_args().map(|a| a.to_string_lossy().into_owned()));
        Ok(parts.join(" "))
    }

    #[test]
    fn editor_order() {
        let mut env = HashMap::from([("VISUAL", "vis"), ("EDITOR", "ed")]);
        let mut cfg = Config {
            editor: "code --wait".into(),
            ..Config::default()
        };
        assert_eq!(args(&cfg, &env).unwrap(), "code --wait /w/attempt.py");
        cfg.editor.clear();
        assert_eq!(args(&cfg, &env).unwrap(), "vis /w/attempt.py");
        env.insert("VISUAL", "");
        assert_eq!(args(&cfg, &env).unwrap(), "ed /w/attempt.py");
    }

    #[test]
    fn editor_fallback_none() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_string_lossy().into_owned();
        let env = HashMap::from([("VISUAL", ""), ("EDITOR", ""), ("PATH", path.as_str())]);
        assert!(args(&Config::default(), &env).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn editor_fallback_finds_path_binary() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let vi = dir.path().join("vi");
        std::fs::write(&vi, "").unwrap();
        std::fs::set_permissions(&vi, std::fs::Permissions::from_mode(0o755)).unwrap();
        let path = dir.path().to_string_lossy().into_owned();
        let env = HashMap::from([("PATH", path.as_str())]);
        let want = format!("{} /w/attempt.py", vi.display());
        assert_eq!(args(&Config::default(), &env).unwrap(), want);
    }
}
