package tui

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
	"github.com/kidskoding/myleet/internal/schedule"
)

var (
	green = runner.Result{Passed: 2, Total: 2, Tests: []runner.TestResult{{Name: "test_add", Outcome: runner.Passed}, {Name: "test_add_negative", Outcome: runner.Passed}}}
	red   = runner.Result{Passed: 1, Total: 2, Tests: []runner.TestResult{
		{Name: "test_add", Outcome: runner.Passed},
		{Name: "test_add_negative", Outcome: runner.Failed, Message: "assert 4 == 0"},
	}}
)

func focusModel(t *testing.T, id string, fr *fakeRunner) (tea.Model, *Shared) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), fr)
	m := tea.Model(New(s, id))
	m = send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
	return drain(m, m.Init()), s
}

// touch edits the attempt file so the next run counts as the learner's work.
func touch(t *testing.T, s *Shared, id string) {
	t.Helper()
	path := s.App.Workspace.AttemptPath(id)
	b, _ := os.ReadFile(path)
	if err := os.WriteFile(path, append(b, []byte("\n# edit\n")...), 0o644); err != nil {
		t.Fatal(err)
	}
}

func kinds(s *Shared) []string {
	var out []string
	for _, e := range s.App.Events {
		out = append(out, string(e.Kind))
	}
	return out
}

func count(s *Shared, k progress.Kind) int {
	n := 0
	for _, e := range s.App.Events {
		if e.Kind == k {
			n++
		}
	}
	return n
}

func TestFocusOpenRecordsOpenedAndRunsSilently(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	if fr.calls != 1 {
		t.Fatalf("runner calls = %d, want 1", fr.calls)
	}
	if got := strings.Join(kinds(s), ","); got != "opened" {
		t.Fatalf("events = %s (the run on open is not logged)", got)
	}
	touch(t, s, "p-one")
	m = send(m, key("space"))
	if got := strings.Join(kinds(s), ","); got != "opened,test_run" {
		t.Fatalf("events = %s", got)
	}
	if !strings.Contains(plain(m), "1/2") {
		t.Fatalf("view:\n%s", plain(m))
	}
}

func TestFocusFileChangeReruns(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	f := m.(Model).top().(*Focus)
	touch(t, s, "p-one")
	send(m, fileChangedMsg{f: f})
	if fr.calls != 2 || count(s, progress.TestRun) != 1 {
		t.Fatalf("calls=%d test_runs=%d", fr.calls, count(s, progress.TestRun))
	}
}

func TestFocusFirstGreenRecordsPassOnce(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red, green}}
	m, s := focusModel(t, "p-one", fr)
	touch(t, s, "p-one")
	m = send(m, key("space"), key("space"))
	if n := count(s, progress.Passed); n != 1 {
		t.Fatalf("passed events = %d", n)
	}
	if !strings.Contains(plain(m), "first pass") {
		t.Fatalf("banner missing:\n%s", plain(m))
	}
	if snaps, _ := s.App.Workspace.Snapshots("p-one"); len(snaps) != 1 {
		t.Fatalf("snapshots = %v", snaps)
	}
}

func TestFocusHintMakesPassUnclean(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red, green}}
	m, s := focusModel(t, "p-one", fr)
	m = send(m, key("t"))
	if !strings.Contains(plain(m), "use +") {
		t.Fatalf("hint not shown:\n%s", plain(m))
	}
	touch(t, s, "p-one")
	m = send(m, key("space"))
	if !strings.Contains(plain(m), "back to 1d") {
		t.Fatalf("banner:\n%s", plain(m))
	}
	if count(s, progress.HintRevealed) != 1 {
		t.Fatal("hint not recorded")
	}
}

func TestFocusEscWithoutRunRecordsLeft(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	m = send(m, key("esc"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("esc should return home")
	}
	if got := strings.Join(kinds(s), ","); got != "opened,left" {
		t.Fatalf("events = %s", got)
	}
	if st := statusOf(s.States(), "p-one"); st.Status != schedule.Unseen {
		t.Fatalf("status = %s", st.Status)
	}
}

func TestFocusResetConfirm(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	path := s.App.Workspace.AttemptPath("p-one")
	os.WriteFile(path, []byte("edited\n"), 0o644)
	m = send(m, key("r"))
	if !strings.Contains(plain(m), "Reset to the starter?") {
		t.Fatalf("no confirm:\n%s", plain(m))
	}
	m = send(m, key("n"))
	if b, _ := os.ReadFile(path); string(b) != "edited\n" {
		t.Fatal("n must not reset")
	}
	send(m, key("r"), key("y"))
	if b, _ := os.ReadFile(path); !strings.Contains(string(b), "NotImplementedError") {
		t.Fatalf("y must reset, got %q", b)
	}
	if count(s, progress.Reset) != 1 {
		t.Fatal("reset not recorded")
	}
}

func TestFocusGiveUp(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	m = send(m, key("g"))
	if count(s, progress.GaveUp) != 1 || count(s, progress.Left) != 0 {
		t.Fatalf("events = %v", kinds(s))
	}
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("give up should return home")
	}
}

func TestFocusSolutionPeek(t *testing.T) {
	fr := &fakeRunner{results: []runner.Result{red}}
	m, s := focusModel(t, "p-one", fr)
	m = send(m, key("s"))
	if !strings.Contains(plain(m), "return a + b") || count(s, progress.SolutionPeeked) != 1 {
		t.Fatalf("solution not shown or not recorded:\n%s", plain(m))
	}
	m2, s2 := focusModel(t, "p-two", fr)
	send(m2, key("s"))
	if count(s2, progress.SolutionPeeked) != 0 {
		t.Fatal("p-two has no solution; s must do nothing")
	}
}

func TestFocusDiffNoEarlierAttempt(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	if !strings.Contains(plain(send(m, key("d"))), "no earlier attempt") {
		t.Fatal("diff with no snapshot")
	}
}

func TestFocusGolden80x24(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	view := plain(m)
	assertFits(t, view, 80, 24)
	assertGolden(t, "focus", view)
}

func focusWithPrompt(t *testing.T, id string, fp fakePrompts) (tea.Model, *Shared) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), &fakeRunner{results: []runner.Result{red}})
	s.Prompts = fp
	m := tea.Model(New(s, id))
	m = send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
	return drain(m, m.Init()), s
}

func TestFocusShowsFetchedStatement(t *testing.T) {
	m, _ := focusWithPrompt(t, "p-one", fakePrompts{md: "Add **two** numbers.", status: prompt.Fetched})
	view := plain(m)
	if !strings.Contains(view, "Add two numbers.") || strings.Contains(view, "Key idea") {
		t.Fatalf("statement should show and the key idea should stay hidden:\n%s", view)
	}
}

func TestFocusKeyIdeaBecomesLastHint(t *testing.T) {
	m, s := focusWithPrompt(t, "p-one", fakePrompts{md: "Add two numbers.", status: prompt.Fetched})
	if !strings.Contains(plain(m), "hint 1/2") {
		t.Fatalf("p-one has one hint plus the key idea:\n%s", plain(m))
	}
	m = send(m, key("t"), key("t"))
	if !strings.Contains(plain(m), "key idea: add them") || count(s, progress.HintRevealed) != 2 {
		t.Fatalf("view:\n%s", plain(m))
	}
}

func TestFocusPremiumFallback(t *testing.T) {
	m, _ := focusWithPrompt(t, "two-sum", fakePrompts{status: prompt.Premium})
	if !strings.Contains(plain(m), "premium on LeetCode") {
		t.Fatalf("view:\n%s", plain(m))
	}
}

func TestFocusOfflineFallback(t *testing.T) {
	m, _ := focusWithPrompt(t, "two-sum", fakePrompts{status: prompt.Offline})
	if !strings.Contains(plain(m), "couldn't reach LeetCode") {
		t.Fatalf("view:\n%s", plain(m))
	}
}

func TestFocusNoSnapshotForUntouchedStarter(t *testing.T) {
	m, s := focusModel(t, "p-two", &fakeRunner{results: []runner.Result{red}})
	send(m, key("esc"))
	if snaps, _ := s.App.Workspace.Snapshots("p-two"); len(snaps) != 0 {
		t.Fatalf("an unedited starter must not be snapshotted: %v", snaps)
	}
}

func TestReviewStartsFromStarter(t *testing.T) {
	a := newTestApp(t, passedEvents("p-one", 18)...)
	path := a.Workspace.AttemptPath("p-one")
	os.MkdirAll(filepath.Dir(path), 0o755)
	os.WriteFile(path, []byte("def add(a, b):\n    return a + b\n"), 0o644)
	written := testNow.AddDate(0, 0, -2) // saved before yesterday's pass
	os.Chtimes(path, written, written)
	s := newTestShared(t, a, &fakeRunner{results: []runner.Result{red}})
	m := tea.Model(New(s, "p-one"))
	drain(m, m.Init())
	if b, _ := os.ReadFile(path); !strings.Contains(string(b), "NotImplementedError") {
		t.Fatalf("a review must start cold from the starter, got %q", b)
	}
	snaps, _ := a.Workspace.Snapshots("p-one")
	if len(snaps) != 1 {
		t.Fatalf("the previous solution must be kept as a snapshot: %v", snaps)
	}
}

func TestUnfinishedWorkIsKept(t *testing.T) {
	a := newTestApp(t)
	path := a.Workspace.AttemptPath("p-one")
	os.MkdirAll(filepath.Dir(path), 0o755)
	os.WriteFile(path, []byte("half done\n"), 0o644)
	s := newTestShared(t, a, &fakeRunner{results: []runner.Result{red}})
	m := tea.Model(New(s, "p-one"))
	drain(m, m.Init())
	if b, _ := os.ReadFile(path); string(b) != "half done\n" {
		t.Fatalf("unfinished work must survive reopening, got %q", b)
	}
}

func TestEditorExitWithoutChangeIsNotLogged(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{green}})
	f := m.(Model).top().(*Focus)
	send(m, editorDoneMsg{f: f})
	if count(s, progress.TestRun) != 0 || count(s, progress.Passed) != 0 {
		t.Fatalf("an unchanged file must not log a run: %v", kinds(s))
	}
}
