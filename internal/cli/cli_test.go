package cli

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/charmbracelet/colorprofile"

	tu "github.com/kidskoding/myleet/internal/testutil"
)

// env points myleet at a temp copy of root, so commands that write the save
// state never touch the fixture tree.
func env(t *testing.T, root string) {
	t.Helper()
	if !strings.HasPrefix(root, os.TempDir()) {
		dst := t.TempDir()
		if err := os.CopyFS(dst, os.DirFS(root)); err != nil {
			t.Fatal(err)
		}
		root = dst
	}
	t.Setenv("MYLEET_ROOT", root)
	t.Setenv("XDG_DATA_HOME", t.TempDir())
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
}

func run(args ...string) (int, string) {
	var out bytes.Buffer
	code := Run(args, &out, &out)
	return code, out.String()
}

func repoPython(t *testing.T) {
	t.Helper()
	py, _ := filepath.Abs(filepath.Join("..", "..", ".venv", "bin", "python"))
	if _, err := os.Stat(py); err != nil {
		t.Skip("repo .venv missing")
	}
	t.Setenv("MYLEET_PYTHON", py)
}

func TestValidateGood(t *testing.T) {
	env(t, tu.GoodRoot())
	code, out := run("validate")
	if code != 0 || !strings.Contains(out, "ok: 4 curriculum problems, 1 in the bank, 1 playlists") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestValidateBad(t *testing.T) {
	env(t, filepath.Join(tu.GoodRoot(), "..", "bad"))
	code, out := run("validate")
	if code != 1 || !strings.Contains(out, "duplicate id") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestCheckSolutions(t *testing.T) {
	env(t, tu.GoodRoot())
	repoPython(t)
	code, out := run("check", "--solutions")
	if code != 0 || !strings.Contains(out, "p-one") || !strings.Contains(out, "2 passed, 0 failed") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestCheckAttemptMissing(t *testing.T) {
	env(t, tu.GoodRoot())
	repoPython(t)
	code, out := run("check", "p-two")
	if code != 1 || !strings.Contains(out, "no attempt") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestStatsEmpty(t *testing.T) {
	env(t, tu.GoodRoot())
	code, out := run("stats")
	if code != 0 || !strings.Contains(out, "streak 0") || !strings.Contains(out, "unseen 4") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestUnknownCommand(t *testing.T) {
	env(t, tu.GoodRoot())
	if code, out := run("frobnicate"); code != 2 || !strings.Contains(out, "usage") {
		t.Fatalf("code=%d out=%s", code, out)
	}
}

func TestPlainWhenNotATerminal(t *testing.T) {
	env(t, tu.GoodRoot())
	_, out := run("stats")
	if strings.Contains(out, "\x1b[") {
		t.Fatalf("piped output must not contain escape codes: %q", out)
	}
}

func TestColorOnTerminal(t *testing.T) {
	env(t, tu.GoodRoot())
	var buf bytes.Buffer
	w := &colorprofile.Writer{Forward: &buf, Profile: colorprofile.ANSI}
	if code := Run([]string{"validate"}, w, w); code != 0 {
		t.Fatalf("code = %d: %s", code, buf.String())
	}
	if !strings.Contains(buf.String(), "\x1b[32m") {
		t.Fatalf("ok should be green: %q", buf.String())
	}
}

func TestDoctorColorsStatus(t *testing.T) {
	env(t, tu.GoodRoot())
	repoPython(t)
	var buf bytes.Buffer
	w := &colorprofile.Writer{Forward: &buf, Profile: colorprofile.ANSI}
	Run([]string{"doctor"}, w, w)
	if !strings.Contains(buf.String(), "\x1b[32mok") {
		t.Fatalf("doctor ok should be green: %q", buf.String())
	}
}

func TestPromptsDownloadsAndCaches(t *testing.T) {
	env(t, tu.GoodRoot())
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Write([]byte(`{"data":{"question":{"isPaidOnly":false,"content":"<p>Find two numbers.</p>"}}}`))
	}))
	defer srv.Close()
	t.Setenv("MYLEET_LEETCODE_ENDPOINT", srv.URL)
	code, out := run("prompts")
	if code != 0 || !strings.Contains(out, "2 fetched") || calls.Load() != 2 {
		t.Fatalf("code=%d calls=%d out=%s", code, calls.Load(), out)
	}
	code, out = run("prompts")
	if code != 0 || !strings.Contains(out, "2 cached") || calls.Load() != 2 {
		t.Fatalf("second run: code=%d calls=%d out=%s", code, calls.Load(), out)
	}
}

func saveFile() string {
	return filepath.Join(os.Getenv("XDG_DATA_HOME"), "myleet", "progress.toml")
}

func fakeEditor(t *testing.T, content string) {
	t.Helper()
	script := filepath.Join(t.TempDir(), "ed.sh")
	body := "#!/bin/sh\ncat > \"$1\" <<'EOT'\n" + content + "EOT\n"
	if err := os.WriteFile(script, []byte(body), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("EDITOR", script)
	t.Setenv("VISUAL", "")
}

func TestProgressAcceptsGoodEdit(t *testing.T) {
	env(t, tu.GoodRoot())
	run("stats") // creates the save file
	fakeEditor(t, "[p-one]\nrung = \"7d\"\ndue = 2026-11-01\nlast = 2026-10-20\n")
	code, out := run("progress")
	if code != 0 || !strings.Contains(out, "saved") {
		t.Fatalf("code=%d out=%s", code, out)
	}
	if _, out := run("stats"); !strings.Contains(out, "reviewing 1") {
		t.Fatalf("edit not applied: %s", out)
	}
}

func TestProgressRestoresOnBadEdit(t *testing.T) {
	env(t, tu.GoodRoot())
	run("stats")
	before, _ := os.ReadFile(saveFile())
	fakeEditor(t, "[p-one]\nrung = \"9d\"\n")
	code, out := run("progress")
	if code != 1 || !strings.Contains(out, "9d") || !strings.Contains(out, "restored") {
		t.Fatalf("code=%d out=%s", code, out)
	}
	if after, _ := os.ReadFile(saveFile()); string(after) != string(before) {
		t.Fatalf("a broken edit must be rolled back:\n%s", after)
	}
}

func TestDoctorShowsSaveFile(t *testing.T) {
	env(t, tu.GoodRoot())
	repoPython(t)
	if _, out := run("doctor"); !strings.Contains(out, "progress.toml") {
		t.Fatalf("doctor should print the save file path: %s", out)
	}
}
