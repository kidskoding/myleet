package tui

import (
	"context"
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/config"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
	tu "github.com/kidskoding/myleet/internal/testutil"
	"github.com/kidskoding/myleet/internal/workspace"
)

var update = flag.Bool("update", false, "rewrite golden files")

// testNow is mon oct 19 2026, 10:00 Chicago.
var testNow = time.Date(2026, 10, 19, 10, 0, 0, 0, tu.Chicago)

type fakeRunner struct {
	results []runner.Result
	calls   int
}

func (f *fakeRunner) Run(context.Context, string, string) runner.Result {
	if len(f.results) == 0 {
		return runner.Result{}
	}
	r := f.results[min(f.calls, len(f.results)-1)]
	f.calls++
	return r
}

func newTestApp(t *testing.T, events ...progress.Event) *app.App {
	t.Helper()
	data := t.TempDir()
	log, _, _ := progress.Open(filepath.Join(data, "events.jsonl"))
	a := &app.App{
		Root: tu.GoodRoot(), Catalog: tu.GoodCatalog(t), Config: config.Default(), Log: log,
		Workspace: workspace.Workspace{Dir: data}, Loc: tu.Chicago,
	}
	clock := testNow
	a.Now = func() time.Time { return clock }
	for _, e := range events {
		if err := a.Record(e); err != nil {
			t.Fatal(err)
		}
	}
	return a
}

// newTestShared builds Shared with no ticks, no watcher, and a fake runner.
func newTestShared(t *testing.T, a *app.App, fr *fakeRunner) *Shared {
	t.Helper()
	s := NewShared(a)
	s.Runner = fr
	s.Tick = func() tea.Cmd { return nil }
	s.Watch = nil
	s.After = nil
	s.Spin = nil
	s.Open = func(string) error { return nil }
	s.Prompts = fakePrompts{status: prompt.NoSource}
	return s
}

type fakePrompts struct {
	md     string
	status prompt.Status
}

func (f fakePrompts) Get(context.Context, *catalog.Problem) prompt.Result {
	return prompt.Result{Markdown: f.md, Status: f.status}
}

func key(k string) tea.KeyPressMsg {
	switch k {
	case "enter":
		return tea.KeyPressMsg{Code: tea.KeyEnter}
	case "esc":
		return tea.KeyPressMsg{Code: tea.KeyEscape}
	case "space":
		return tea.KeyPressMsg{Code: tea.KeySpace, Text: " "}
	case "tab":
		return tea.KeyPressMsg{Code: tea.KeyTab}
	case "up":
		return tea.KeyPressMsg{Code: tea.KeyUp}
	case "down":
		return tea.KeyPressMsg{Code: tea.KeyDown}
	}
	r := []rune(k)[0]
	return tea.KeyPressMsg{Code: r, Text: k}
}

// drain runs cmd and feeds every resulting message back into m, depth-first.
func drain(m tea.Model, cmd tea.Cmd) tea.Model {
	for i := 0; cmd != nil && i < 50; i++ {
		msg := cmd()
		switch msg := msg.(type) {
		case nil:
			return m
		case tea.BatchMsg:
			for _, c := range msg {
				m = drain(m, c)
			}
			return m
		case tea.QuitMsg:
			return m
		default:
			m, cmd = m.Update(msg)
		}
	}
	return m
}

func send(m tea.Model, msgs ...tea.Msg) tea.Model {
	for _, msg := range msgs {
		var cmd tea.Cmd
		m, cmd = m.Update(msg)
		m = drain(m, cmd)
	}
	return m
}

func plain(m tea.Model) string { return ansi.Strip(m.View().Content) }

func plainString(s string) string { return ansi.Strip(s) }

func assertGolden(t *testing.T, name, got string) {
	t.Helper()
	path := filepath.Join("testdata", name+".golden")
	if *update {
		if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("missing golden %s (run go test ./internal/tui/ -update): %v", path, err)
	}
	if got != string(want) {
		t.Fatalf("view differs from %s\n--- got ---\n%s\n--- want ---\n%s", path, got, want)
	}
}

func assertFits(t *testing.T, view string, width, height int) {
	t.Helper()
	lines := strings.Split(view, "\n")
	if len(lines) > height {
		t.Errorf("%d lines, want <= %d", len(lines), height)
	}
	for i, l := range lines {
		if w := lipgloss.Width(l); w > width {
			t.Errorf("line %d is %d cells wide, want <= %d: %q", i, w, width, l)
		}
	}
}

func ids(ps []*catalog.Problem) []string {
	var out []string
	for _, p := range ps {
		out = append(out, p.ID)
	}
	return out
}
