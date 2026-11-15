//! The loaded trainer: curriculum, config, history and the save file, shared by
//! the CLI commands and the TUI.

use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::{Path, PathBuf};

use jiff::tz::TimeZone;
use jiff::{SignedDuration, Timestamp};

use crate::catalog::{self, Catalog, Difficulty};
use crate::config::{self, Config};
use crate::progress::{Event, Log};
use crate::prompt;
use crate::runner::{self, Runner};
use crate::savestate::{self, ReadError};
use crate::schedule::{self, Attempt, Outcome, State, Status};
use crate::workspace::Workspace;

pub const SAVE_FILE: &str = "progress.toml";
pub const HISTORY_FILE: &str = "events.jsonl";
/// Progress briefly lived in the repo; it is moved out on load.
const LEGACY_REPO: &str = ".myleet";

/// The process inputs loading reads, so tests can supply their own without
/// mutating the (shared, parallel) process environment.
pub struct Env<'a> {
    pub cwd: PathBuf,
    pub var: config::Env<'a>,
}

impl Env<'static> {
    pub fn system() -> Env<'static> {
        Env {
            cwd: std::env::current_dir().unwrap_or_default(),
            var: &config::system_env,
        }
    }
}

impl Env<'_> {
    /// Like Go's `os.Getenv(k) != ""`.
    pub fn get(&self, key: &str) -> Option<String> {
        (self.var)(key).filter(|v| !v.is_empty())
    }

    pub fn data_dir(&self) -> PathBuf {
        config::data_dir_with(self.var)
    }

    pub fn ensure_root(&self, warn: &mut dyn Write) -> Result<PathBuf, String> {
        catalog::ensure_root_with(&self.cwd, &self.data_dir(), self.get("MYLEET_ROOT"), warn)
    }
}

pub type Clock = Box<dyn Fn() -> Timestamp + Send + Sync>;

pub struct App {
    pub root: PathBuf,
    pub catalog: Catalog,
    pub config: Config,
    pub log: Log,
    pub events: Vec<Event>,
    pub workspace: Workspace,
    pub runner: Runner,
    pub prompts: prompt::Source,
    pub python_err: Option<String>,
    /// The save file; `None` keeps state in memory only (tests).
    pub state_path: Option<PathBuf>,
    pub now: Clock,
    pub tz: TimeZone,

    states: HashMap<String, State>,
    /// Attempt ids already applied to the save state.
    applied: HashSet<String>,
}

impl App {
    /// An in-memory app (no save file) whose states are rebuilt from `events`.
    pub fn new(catalog: Catalog, log: Log, events: Vec<Event>, workspace: Workspace) -> App {
        let mut a = App {
            root: catalog.root.clone(),
            catalog,
            config: Config::default(),
            log,
            events,
            workspace,
            runner: Runner::default(),
            prompts: prompt::Source::default(),
            python_err: None,
            state_path: None,
            now: Box::new(Timestamp::now),
            tz: TimeZone::system(),
            states: HashMap::new(),
            applied: HashSet::new(),
        };
        a.states = a.compute_states();
        a.mark_applied();
        a
    }

    pub fn load(warn: &mut dyn Write) -> Result<App, String> {
        App::load_with(&Env::system(), warn)
    }

    /// Refuses a broken save file so a hand edit is never overwritten.
    pub fn load_with(env: &Env, warn: &mut dyn Write) -> Result<App, String> {
        let root = env.ensure_root(warn)?;
        let cat = catalog::load(&root).map_err(|e| format!("curriculum has problems:\n{e}"))?;
        let cfg = config::load_with(env.var)
            .map_err(|e| format!("config {}: {e}", config::path_with(env.var).display()))?;
        let data = env.data_dir();
        let state_dir = cfg.state_dir_path_with(env.var);
        if let Err(e) = move_out_of_repo(&root.join(LEGACY_REPO), &state_dir) {
            let _ = writeln!(
                warn,
                "warning: could not move progress out of the repo: {e}"
            );
        }
        let (log, events, warns) = Log::open(&state_dir.join(HISTORY_FILE));
        for w in warns {
            let _ = writeln!(warn, "warning: {w}");
        }
        let (python, python_err) = match runner::resolve_python_from(&cfg, &root, env.var) {
            Ok(py) => (py, None),
            Err(e) => (Vec::new(), Some(e)),
        };
        let state_path = state_dir.join(SAVE_FILE);
        let mut a = App {
            runner: Runner {
                python,
                timeout: cfg.timeout,
                lib_dir: cat.lib_dir(),
            },
            prompts: prompt::Source {
                dir: data.join("prompts"),
                endpoint: env.get("MYLEET_LEETCODE_ENDPOINT").unwrap_or_default(),
            },
            python_err,
            config: cfg,
            root,
            state_path: Some(state_path.clone()),
            ..App::new(cat, log, events, Workspace { dir: data })
        };
        match savestate::read(&state_path, &a.tz) {
            Ok(states) => a.states = states,
            Err(ReadError::Missing) => {
                if let Err(e) = savestate::write(&state_path, &a.catalog, &a.states, &a.tz) {
                    let _ = writeln!(
                        warn,
                        "warning: could not write {}: {e}",
                        state_path.display()
                    );
                }
            }
            Err(e) => {
                return Err(format!(
                    "your save file has a problem (fix it with `myleet progress`):\n{e}"
                ));
            }
        }
        Ok(a)
    }

    pub fn target(&self, id: &str) -> SignedDuration {
        let target = self
            .catalog
            .problem(id)
            .map_or(Difficulty::Medium.default_time_target(), |p| p.time_target);
        SignedDuration::try_from(target).unwrap_or(SignedDuration::ZERO)
    }

    pub fn states(&self) -> &HashMap<String, State> {
        &self.states
    }

    pub fn attempts(&self) -> Vec<Attempt> {
        schedule::attempts(&self.events, |id| self.target(id))
    }

    fn compute_states(&self) -> HashMap<String, State> {
        schedule::compute(&self.events, |id| self.target(id), &self.tz)
    }

    fn mark_applied(&mut self) {
        self.applied = self
            .attempts()
            .into_iter()
            .filter(|at| at.outcome != Outcome::None)
            .map(|at| at.id)
            .collect();
    }

    /// Re-reads the save file before applying an attempt, so edits made by hand
    /// while myleet runs are kept.
    pub fn record(&mut self, e: Event) -> Result<(), String> {
        self.log.append(&e).map_err(|err| err.to_string())?;
        let attempt = e.attempt.clone();
        let problem = e.problem.clone();
        self.events.push(e);
        if self.applied.contains(&attempt) {
            return Ok(());
        }
        let mine: Vec<Event> = self
            .events
            .iter()
            .filter(|ev| ev.attempt == attempt)
            .cloned()
            .collect();
        let atts = schedule::attempts(&mine, |id| self.target(id));
        let Some(first) = atts.first().filter(|a| a.outcome != Outcome::None) else {
            return Ok(());
        };
        self.applied.insert(attempt);
        if let Some(path) = &self.state_path {
            match savestate::read(path, &self.tz) {
                Ok(on_disk) => self.states = on_disk,
                Err(ReadError::Missing) => {}
                Err(err) => {
                    return Err(format!(
                        "not saving: your save file has a problem (fix it with `myleet progress`): {err}"
                    ));
                }
            }
        }
        let st = self.states.remove(&problem).unwrap_or(State {
            status: Status::Unseen,
            rung: -1,
            ..State::default()
        });
        self.states
            .insert(problem, schedule::apply(st, first, &self.tz));
        match &self.state_path {
            Some(path) => savestate::write(path, &self.catalog, &self.states, &self.tz)
                .map_err(|err| err.to_string()),
            None => Ok(()),
        }
    }

    /// Clears the save file, archives and empties the event log, and wipes
    /// attempt/snapshot files. The prompt cache is kept.
    pub fn reset_progress(&mut self) -> Result<(), String> {
        let stamp = (self.now)().strftime("%Y%m%dT%H%M%SZ").to_string();
        let mut backup = self.log.path().as_os_str().to_owned();
        backup.push(format!(".bak-{stamp}"));
        self.log
            .replace(&[], Some(Path::new(&backup)))
            .map_err(|e| e.to_string())?;
        self.events.clear();
        self.states.clear();
        self.applied.clear();
        if let Some(path) = &self.state_path {
            savestate::write(path, &self.catalog, &self.states, &self.tz)
                .map_err(|e| e.to_string())?;
        }
        if !self.workspace.dir.as_os_str().is_empty() {
            self.workspace.clear_attempts().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

/// Migrates progress from `<repo>/.myleet`, where it briefly lived.
fn move_out_of_repo(repo_state: &Path, state_dir: &Path) -> std::io::Result<()> {
    let legacy_log = repo_state.join(HISTORY_FILE);
    let Ok(data) = std::fs::read(&legacy_log) else {
        return Ok(());
    };
    let current = state_dir.join(HISTORY_FILE);
    if !current.exists() {
        std::fs::create_dir_all(state_dir)?;
        std::fs::write(&current, data)?;
    }
    std::fs::remove_file(&legacy_log)?;
    let _ = std::fs::remove_file(repo_state.join(SAVE_FILE));
    std::fs::remove_dir(repo_state)
}

#[cfg(test)]
pub(crate) mod testenv {
    use std::collections::HashMap;
    use std::path::{Path, PathBuf};

    use super::Env;

    pub fn copy_dir(src: &Path, dst: &Path) {
        std::fs::create_dir_all(dst).unwrap();
        for entry in std::fs::read_dir(src).unwrap() {
            let entry = entry.unwrap();
            let to = dst.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() {
                copy_dir(&entry.path(), &to);
            } else {
                std::fs::copy(entry.path(), to).unwrap();
            }
        }
    }

    /// Mirrors the Go tests' MYLEET_ROOT + XDG_* setup: a temp copy of a fixture
    /// root, a temp data home and a temp config home.
    pub struct TestEnv {
        pub root: tempfile::TempDir,
        pub data_home: tempfile::TempDir,
        pub config_home: tempfile::TempDir,
        pub vars: HashMap<String, String>,
    }

    impl TestEnv {
        pub fn new(fixture: &str) -> TestEnv {
            let root = tempfile::tempdir().unwrap();
            copy_dir(&crate::catalog::testdata(fixture), root.path());
            let data_home = tempfile::tempdir().unwrap();
            let config_home = tempfile::tempdir().unwrap();
            let mut vars = HashMap::new();
            let path = |d: &tempfile::TempDir| d.path().to_string_lossy().into_owned();
            vars.insert("MYLEET_ROOT".into(), path(&root));
            vars.insert("XDG_DATA_HOME".into(), path(&data_home));
            vars.insert("XDG_CONFIG_HOME".into(), path(&config_home));
            // PATH lets python/editor lookups behave like the real process.
            if let Ok(p) = std::env::var("PATH") {
                vars.insert("PATH".into(), p);
            }
            TestEnv {
                root,
                data_home,
                config_home,
                vars,
            }
        }

        pub fn set(&mut self, key: &str, value: impl Into<String>) {
            self.vars.insert(key.into(), value.into());
        }

        pub fn state(&self) -> PathBuf {
            self.data_home.path().join("myleet")
        }

        pub fn save(&self) -> PathBuf {
            self.state().join(super::SAVE_FILE)
        }

        pub fn with<R>(&self, f: impl FnOnce(&Env) -> R) -> R {
            let lookup = |k: &str| self.vars.get(k).cloned();
            let env = Env {
                cwd: std::env::temp_dir(),
                var: &lookup,
            };
            f(&env)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::fs;

    use jiff::{SignedDuration, Timestamp};

    use super::testenv::TestEnv;
    use super::*;
    use crate::progress::{kind, mode, new_attempt_id};

    fn load(e: &TestEnv) -> App {
        e.with(|env| App::load_with(env, &mut std::io::sink()))
            .unwrap()
    }

    fn ev(at: Timestamp, k: &str, id: &str, att: &str) -> Event {
        Event {
            time: at,
            kind: k.into(),
            problem: id.into(),
            attempt: att.into(),
            mode: mode::PRACTICE.into(),
            data: BTreeMap::new(),
        }
    }

    fn pass(a: &mut App, id: &str, at: Timestamp) {
        let att = new_attempt_id();
        a.record(ev(at, kind::OPENED, id, &att)).unwrap();
        let mut done = ev(at + SignedDuration::from_mins(1), kind::PASSED, id, &att);
        done.data.insert("elapsed_ms".into(), "60000".into());
        a.record(done).unwrap();
    }

    #[test]
    fn save_file_is_source_of_truth() {
        let e = TestEnv::new("good");
        fs::create_dir_all(e.state()).unwrap();
        fs::write(
            e.save(),
            "[p-one]\nrung = \"14d\"\ndue = 2026-11-01\nlast = 2026-10-18\n",
        )
        .unwrap();
        let a = load(&e);
        let st = &a.states()["p-one"];
        assert_eq!((st.status, st.rung), (Status::Mastered, 3));
    }

    #[test]
    fn record_applies_attempt_to_save_file() {
        let e = TestEnv::new("good");
        let mut a = load(&e);
        pass(&mut a, "p-one", Timestamp::now());
        let data = fs::read_to_string(e.save()).unwrap();
        assert!(data.contains("[p-one]\nrung = \"1d\""), "{data}");
        assert!(
            e.state().join(HISTORY_FILE).exists(),
            "history log should sit next to the save file"
        );
    }

    #[test]
    fn hand_edit_survives_record() {
        let e = TestEnv::new("good");
        let mut a = load(&e);
        pass(
            &mut a,
            "p-one",
            Timestamp::now() - SignedDuration::from_hours(1),
        );
        fs::write(e.save(), "# I removed p-one by hand\n").unwrap();
        pass(&mut a, "p-two", Timestamp::now());
        let data = fs::read_to_string(e.save()).unwrap();
        assert!(
            !data.contains("[p-one]") && data.contains("[p-two]"),
            "a hand edit must survive the next action:\n{data}"
        );
    }

    #[test]
    fn broken_save_file_stops_load() {
        let e = TestEnv::new("good");
        fs::create_dir_all(e.state()).unwrap();
        fs::write(e.save(), "[p-one]\nrung = \"1d\"\nlast = nope\n").unwrap();
        let err = e
            .with(|env| App::load_with(env, &mut std::io::sink()))
            .err()
            .unwrap();
        assert!(
            err.contains("line 3") && err.contains("myleet progress"),
            "{err}"
        );
    }

    #[test]
    fn builds_save_file_from_history() {
        let e = TestEnv::new("good");
        fs::create_dir_all(e.state()).unwrap();
        let log = r#"{"t":"2026-10-19T15:00:00Z","kind":"opened","problem":"p-one","attempt":"a1","mode":"practice"}
{"t":"2026-10-19T15:05:00Z","kind":"passed","problem":"p-one","attempt":"a1","mode":"practice","data":{"elapsed_ms":"300000"}}
"#;
        fs::write(e.state().join(HISTORY_FILE), log).unwrap();
        load(&e);
        let data = fs::read_to_string(e.save()).unwrap();
        assert!(
            data.contains("[p-one]"),
            "save file should be built from history:\n{data}"
        );
    }

    #[test]
    fn moves_progress_out_of_the_repo() {
        let e = TestEnv::new("good");
        let repo_state = e.root.path().join(".myleet");
        fs::create_dir_all(&repo_state).unwrap();
        fs::write(
            repo_state.join(HISTORY_FILE),
            "{\"t\":\"2026-10-19T15:00:00Z\",\"kind\":\"opened\",\"problem\":\"p-one\",\"attempt\":\"a1\",\"mode\":\"practice\"}\n",
        )
        .unwrap();
        fs::write(repo_state.join(SAVE_FILE), "# generated\n").unwrap();
        let a = load(&e);
        assert_eq!(a.events.len(), 1, "events not moved");
        assert!(
            !repo_state.exists(),
            "the repo .myleet folder should be gone after moving"
        );
    }

    #[test]
    fn state_dir_from_config() {
        let e = TestEnv::new("good");
        let custom = tempfile::tempdir().unwrap();
        let cfg_dir = e.config_home.path().join("myleet");
        fs::create_dir_all(&cfg_dir).unwrap();
        fs::write(
            cfg_dir.join("config.toml"),
            format!("state_dir = \"{}\"\n", custom.path().display()),
        )
        .unwrap();
        let mut a = load(&e);
        pass(&mut a, "p-one", Timestamp::now());
        assert!(
            custom.path().join(SAVE_FILE).exists(),
            "save file should follow state_dir"
        );
    }

    #[test]
    fn reset_progress() {
        let e = TestEnv::new("good");
        let mut a = load(&e);
        pass(&mut a, "p-one", Timestamp::now());
        let ws = e.state().join("workspace").join("p-one");
        fs::create_dir_all(&ws).unwrap();
        fs::write(ws.join("attempt.py"), "x\n").unwrap();
        a.reset_progress().unwrap();
        assert!(
            a.events.is_empty() && a.states().get("p-one").is_none_or(|st| st.attempts == 0),
            "memory not cleared"
        );
        let data = fs::read_to_string(e.save()).unwrap();
        assert!(
            !data.contains("[p-one]"),
            "save file still has p-one:\n{data}"
        );
        assert!(
            !ws.join("attempt.py").exists(),
            "workspace attempt should be gone"
        );
        let archived = fs::read_dir(e.state()).unwrap().flatten().any(|f| {
            f.file_name()
                .to_string_lossy()
                .starts_with("events.jsonl.bak-")
        });
        assert!(archived, "history should be archived");
    }

    #[test]
    fn in_memory_app_rebuilds_states_from_events() {
        let dir = tempfile::tempdir().unwrap();
        let (log, _, _) = Log::open(&dir.path().join(HISTORY_FILE));
        let t = Timestamp::now();
        let mut done = ev(t, kind::PASSED, "p-one", "a1");
        done.data.insert("elapsed_ms".into(), "60000".into());
        let events = vec![ev(t, kind::OPENED, "p-one", "a1"), done];
        let ws = Workspace {
            dir: dir.path().to_path_buf(),
        };
        let mut a = App::new(crate::testutil::good_catalog(), log, events, ws);
        assert_eq!(a.states()["p-one"].rung, 0);
        // An event for an already-applied attempt must not apply it twice.
        a.record(ev(t, kind::LEFT, "p-one", "a1")).unwrap();
        assert_eq!(a.states()["p-one"].attempts, 1);
    }
}
