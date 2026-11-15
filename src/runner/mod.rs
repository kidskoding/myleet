mod junit;
mod proc;
mod python;

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

pub use junit::parse_junit;
pub use python::{look_path, resolve_python};

const POLL: Duration = Duration::from_millis(10);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Passed,
    Failed,
    Errored,
    Skipped,
}

impl Outcome {
    pub fn as_str(self) -> &'static str {
        match self {
            Outcome::Passed => "passed",
            Outcome::Failed => "failed",
            Outcome::Errored => "error",
            Outcome::Skipped => "skipped",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestResult {
    pub name: String,
    pub outcome: Outcome,
    pub message: String,
    pub detail: String,
}

#[derive(Debug, Clone, Default)]
pub struct RunResult {
    pub tests: Vec<TestResult>,
    pub passed: usize,
    pub total: usize,
    pub not_started: bool,
    pub timed_out: bool,
    pub err: Option<String>,
    pub output: String,
    pub duration: Duration,
}

impl RunResult {
    pub fn green(&self) -> bool {
        self.total > 0 && self.passed == self.total
    }

    fn error(msg: impl Into<String>) -> RunResult {
        RunResult {
            err: Some(msg.into()),
            ..RunResult::default()
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Runner {
    pub python: Vec<String>,
    /// Zero means no timeout.
    pub timeout: Duration,
    pub lib_dir: PathBuf,
}

impl Runner {
    /// Stages `code_file` as solution.py, since every test imports from solution.
    pub fn run(&self, test_file: &Path, code_file: &Path) -> RunResult {
        let start = Instant::now();
        let mut res = self.run_inner(test_file, code_file);
        res.duration = start.elapsed();
        res
    }

    fn run_inner(&self, test_file: &Path, code_file: &Path) -> RunResult {
        let Some((program, py_args)) = self.python.split_first() else {
            return RunResult::error("no python configured");
        };
        let dir = match tempfile::Builder::new().prefix("myleet-run-").tempdir() {
            Ok(d) => d,
            Err(e) => return RunResult::error(e.to_string()),
        };
        if let Err(e) = fs::copy(code_file, dir.path().join("solution.py")) {
            return RunResult::error(format!("read code: {e}"));
        }
        if let Err(e) = fs::copy(test_file, dir.path().join("test_problem.py")) {
            return RunResult::error(format!("read tests: {e}"));
        }
        let report = dir.path().join("r.xml");
        // One file for stdout and stderr keeps them interleaved like Go's CombinedOutput.
        let log_path = dir.path().join("out.log");
        let log = match fs::File::create(&log_path) {
            Ok(f) => f,
            Err(e) => return RunResult::error(e.to_string()),
        };
        let log_err = match log.try_clone() {
            Ok(f) => f,
            Err(e) => return RunResult::error(e.to_string()),
        };

        let mut cmd = Command::new(program);
        cmd.args(py_args)
            .args(["-m", "pytest", "-q", "-p", "no:cacheprovider"])
            .arg(format!("--junitxml={}", report.display()))
            .arg("test_problem.py")
            .current_dir(dir.path())
            .env("PYTHONPATH", &self.lib_dir)
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .stdin(Stdio::null())
            .stdout(log)
            .stderr(log_err);
        proc::own_group(&mut cmd);

        let deadline = (!self.timeout.is_zero()).then(|| Instant::now() + self.timeout);
        let mut timed_out = false;
        match cmd.spawn() {
            Err(e) => return RunResult::error(format!("start python: {e}")),
            Ok(mut child) => loop {
                match child.try_wait() {
                    Ok(Some(_)) => break,
                    Ok(None) if deadline.is_some_and(|d| Instant::now() >= d) => {
                        proc::kill_group(&mut child);
                        let _ = child.wait();
                        timed_out = true;
                        break;
                    }
                    Ok(None) => std::thread::sleep(POLL),
                    Err(e) => return RunResult::error(e.to_string()),
                }
            },
        }

        let mut res = RunResult {
            output: fs::read(&log_path)
                .map(|b| String::from_utf8_lossy(&b).into_owned())
                .unwrap_or_default(),
            ..RunResult::default()
        };
        if timed_out {
            res.timed_out = true;
            return res;
        }
        let data = match fs::read_to_string(&report) {
            Ok(d) => d,
            Err(_) => {
                let first = res.output.trim().split('\n').next().unwrap_or_default();
                res.err = Some(format!(
                    "pytest did not produce results (is pytest installed?): {first}"
                ));
                return res;
            }
        };
        let tests = match parse_junit(&data) {
            Ok(t) => t,
            Err(e) => {
                res.err = Some(format!("read pytest results: {e}"));
                return res;
            }
        };
        res.total = tests.len();
        let (mut not_implemented, mut non_passing) = (0, 0);
        for t in &tests {
            if t.outcome == Outcome::Passed {
                res.passed += 1;
                continue;
            }
            non_passing += 1;
            if t.message.contains("NotImplementedError") || t.detail.contains("NotImplementedError")
            {
                not_implemented += 1;
            }
        }
        res.not_started = non_passing > 0 && not_implemented == non_passing;
        res.tests = tests;
        res
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;

    fn fixtures() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("internal/runner/testdata")
    }

    /// `None` means no python here; the test is skipped like Go's t.Skipf.
    fn test_runner(timeout: Duration) -> Option<(Runner, tempfile::TempDir)> {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let python = match resolve_python(&Config::default(), root) {
            Ok(py) => py,
            Err(e) => {
                eprintln!("skipping: no python: {e}");
                return None;
            }
        };
        let lib = tempfile::tempdir().unwrap();
        let runner = Runner {
            python,
            timeout,
            lib_dir: lib.path().to_path_buf(),
        };
        Some((runner, lib))
    }

    fn run_fixture(r: &Runner, name: &str) -> RunResult {
        let dir = fixtures().join(name);
        r.run(&dir.join("test_problem.py"), &dir.join("code.py"))
    }

    const LONG: Duration = Duration::from_secs(30);

    #[test]
    fn run_pass() {
        let Some((r, _lib)) = test_runner(LONG) else {
            return;
        };
        let res = run_fixture(&r, "pass");
        assert!(
            res.err.is_none() && res.passed == 2 && res.total == 2 && res.green(),
            "{res:?}"
        );
    }

    #[test]
    fn run_fail() {
        let Some((r, _lib)) = test_runner(LONG) else {
            return;
        };
        let res = run_fixture(&r, "fail");
        assert!(
            res.passed == 1 && res.total == 2 && !res.green() && !res.not_started,
            "{res:?}"
        );
        let failed = res
            .tests
            .iter()
            .find(|t| t.outcome == Outcome::Failed)
            .unwrap();
        assert_eq!(failed.name, "test_add");
        assert!(failed.message.contains("assert 4 == 3"), "{failed:?}");
    }

    #[test]
    fn run_stub() {
        let Some((r, _lib)) = test_runner(LONG) else {
            return;
        };
        let res = run_fixture(&r, "stub");
        assert!(
            res.not_started && res.passed == 0 && !res.green(),
            "{res:?}"
        );
    }

    #[test]
    fn run_hang() {
        let Some((r, _lib)) = test_runner(Duration::from_secs(1)) else {
            return;
        };
        let start = Instant::now();
        let res = run_fixture(&r, "hang");
        assert!(res.timed_out && !res.green(), "{res:?}");
        assert!(
            start.elapsed() <= Duration::from_secs(3),
            "took {:?}",
            start.elapsed()
        );
    }

    #[test]
    fn run_syntax_error() {
        let Some((r, _lib)) = test_runner(LONG) else {
            return;
        };
        let res = run_fixture(&r, "syntax");
        assert!(
            !res.green() && res.err.is_none() && res.output.contains("SyntaxError"),
            "{res:?}"
        );
    }

    #[test]
    fn run_missing_code() {
        let Some((r, _lib)) = test_runner(LONG) else {
            return;
        };
        let gone = tempfile::tempdir().unwrap();
        let res = r.run(
            &fixtures().join("pass/test_problem.py"),
            &gone.path().join("gone.py"),
        );
        assert!(res.err.is_some() && !res.green(), "{res:?}");
    }

    #[test]
    fn no_python_configured() {
        let res = Runner::default().run(Path::new("t.py"), Path::new("c.py"));
        assert_eq!(res.err.as_deref(), Some("no python configured"));
    }
}
