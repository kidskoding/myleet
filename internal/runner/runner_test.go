package runner

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/config"
)

func testRunner(t *testing.T, timeout time.Duration) Runner {
	t.Helper()
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	py, err := ResolvePython(config.Default(), root)
	if err != nil {
		t.Skipf("no python: %v", err)
	}
	return Runner{Python: py, Timeout: timeout, LibDir: t.TempDir()}
}

func runFixture(t *testing.T, r Runner, name string) Result {
	dir := filepath.Join("testdata", name)
	return r.Run(context.Background(), filepath.Join(dir, "test_problem.py"), filepath.Join(dir, "code.py"))
}

func TestRunPass(t *testing.T) {
	res := runFixture(t, testRunner(t, 30*time.Second), "pass")
	if res.Err != nil || res.Passed != 2 || res.Total != 2 || !res.Green() {
		t.Fatalf("res = %+v", res)
	}
}

func TestRunFail(t *testing.T) {
	res := runFixture(t, testRunner(t, 30*time.Second), "fail")
	if res.Passed != 1 || res.Total != 2 || res.Green() || res.NotStarted {
		t.Fatalf("res = %+v", res)
	}
	var failed TestResult
	for _, tr := range res.Tests {
		if tr.Outcome == Failed {
			failed = tr
		}
	}
	if failed.Name != "test_add" || !strings.Contains(failed.Message, "assert 4 == 3") {
		t.Fatalf("failed = %+v", failed)
	}
}

func TestRunStub(t *testing.T) {
	res := runFixture(t, testRunner(t, 30*time.Second), "stub")
	if !res.NotStarted || res.Passed != 0 || res.Green() {
		t.Fatalf("res = %+v", res)
	}
}

func TestRunHang(t *testing.T) {
	start := time.Now()
	res := runFixture(t, testRunner(t, time.Second), "hang")
	if !res.TimedOut || res.Green() {
		t.Fatalf("res = %+v", res)
	}
	if took := time.Since(start); took > 3*time.Second {
		t.Fatalf("took %v", took)
	}
}

func TestRunSyntaxError(t *testing.T) {
	res := runFixture(t, testRunner(t, 30*time.Second), "syntax")
	if res.Green() || res.Err != nil || !strings.Contains(res.Output, "SyntaxError") {
		t.Fatalf("res = %+v", res)
	}
}

func TestRunMissingCode(t *testing.T) {
	r := testRunner(t, 30*time.Second)
	res := r.Run(context.Background(), filepath.Join("testdata", "pass", "test_problem.py"), filepath.Join(t.TempDir(), "gone.py"))
	if res.Err == nil || res.Green() {
		t.Fatalf("res = %+v", res)
	}
}

func TestParseJUnit(t *testing.T) {
	xml := `<?xml version="1.0" encoding="utf-8"?><testsuites><testsuite name="pytest" errors="1" failures="1" tests="3">
<testcase classname="test_problem" name="test_ok" time="0.001" />
<testcase classname="test_problem" name="test_bad" time="0.001"><failure message="assert 1 == 2&#10;more">long
detail</failure></testcase>
<testcase classname="test_problem" name="test_err" time="0.001"><error message="NameError: x">trace</error></testcase>
</testsuite></testsuites>`
	got, err := ParseJUnit([]byte(xml))
	if err != nil {
		t.Fatal(err)
	}
	want := []TestResult{
		{Name: "test_ok", Outcome: Passed},
		{Name: "test_bad", Outcome: Failed, Message: "assert 1 == 2", Detail: "long\ndetail"},
		{Name: "test_err", Outcome: Errored, Message: "NameError: x", Detail: "trace"},
	}
	if len(got) != len(want) {
		t.Fatalf("got %+v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("%d: got %+v want %+v", i, got[i], want[i])
		}
	}
}

func TestResolvePythonPrefersConfig(t *testing.T) {
	cfg := config.Default()
	cfg.Python = "/opt/py/bin/python3 -X dev"
	got, err := ResolvePython(cfg, t.TempDir())
	if err != nil || strings.Join(got, " ") != "/opt/py/bin/python3 -X dev" {
		t.Fatalf("got %v %v", got, err)
	}
	cfg.Python = ""
	t.Setenv("MYLEET_PYTHON", "/env/python")
	if got, _ := ResolvePython(cfg, t.TempDir()); strings.Join(got, " ") != "/env/python" {
		t.Fatalf("env: got %v", got)
	}
}
