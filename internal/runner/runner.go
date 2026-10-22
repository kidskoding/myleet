package runner

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type Outcome string

const (
	Passed  Outcome = "passed"
	Failed  Outcome = "failed"
	Errored Outcome = "error"
	Skipped Outcome = "skipped"
)

type TestResult struct {
	Name    string
	Outcome Outcome
	Message string
	Detail  string
}

type Result struct {
	Tests         []TestResult
	Passed, Total int
	NotStarted    bool
	TimedOut      bool
	Err           error
	Output        string
	Duration      time.Duration
}

func (r Result) Green() bool { return r.Total > 0 && r.Passed == r.Total }

type Runner struct {
	Python  []string
	Timeout time.Duration
	LibDir  string
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0o644)
}

// Run stages codeFile as solution.py, since every test imports from solution.
func (r Runner) Run(ctx context.Context, testFile, codeFile string) Result {
	start := time.Now()
	res := r.run(ctx, testFile, codeFile)
	res.Duration = time.Since(start)
	return res
}

func (r Runner) run(ctx context.Context, testFile, codeFile string) Result {
	if len(r.Python) == 0 {
		return Result{Err: errors.New("no python configured")}
	}
	dir, err := os.MkdirTemp("", "myleet-run-")
	if err != nil {
		return Result{Err: err}
	}
	defer os.RemoveAll(dir)
	if err := copyFile(codeFile, filepath.Join(dir, "solution.py")); err != nil {
		return Result{Err: fmt.Errorf("read code: %w", err)}
	}
	if err := copyFile(testFile, filepath.Join(dir, "test_problem.py")); err != nil {
		return Result{Err: fmt.Errorf("read tests: %w", err)}
	}

	if r.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, r.Timeout)
		defer cancel()
	}
	report := filepath.Join(dir, "r.xml")
	args := append(append([]string{}, r.Python[1:]...),
		"-m", "pytest", "-q", "-p", "no:cacheprovider", "--junitxml="+report, "test_problem.py")
	cmd := exec.CommandContext(ctx, r.Python[0], args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "PYTHONPATH="+r.LibDir, "PYTHONDONTWRITEBYTECODE=1")
	killProcessGroup(cmd)
	cmd.WaitDelay = time.Second
	out, _ := cmd.CombinedOutput()

	res := Result{Output: string(out)}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		res.TimedOut = true
		return res
	}
	data, err := os.ReadFile(report)
	if err != nil {
		res.Err = fmt.Errorf("pytest did not produce results (is pytest installed?): %s", firstLine(res.Output))
		return res
	}
	tests, err := ParseJUnit(data)
	if err != nil {
		res.Err = fmt.Errorf("read pytest results: %w", err)
		return res
	}
	res.Tests, res.Total = tests, len(tests)
	notImplemented, nonPassing := 0, 0
	for _, t := range tests {
		if t.Outcome == Passed {
			res.Passed++
			continue
		}
		nonPassing++
		if strings.Contains(t.Message+t.Detail, "NotImplementedError") {
			notImplemented++
		}
	}
	res.NotStarted = nonPassing > 0 && notImplemented == nonPassing
	return res
}
