package tui

import (
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
)

func TestInterviewPerProblemClock(t *testing.T) {
	a := newTestApp(t)
	clock := testNow
	a.Now = func() time.Time { return clock }
	s := newTestShared(t, a, &fakeRunner{results: []runner.Result{green}})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("i"))
	iv := m.(Model).top().(*Interview)
	iv.pick = func(int) []*catalog.Problem {
		one, _ := a.Catalog.Problem("p-one")
		two, _ := a.Catalog.Problem("p-two")
		return []*catalog.Problem{one, two}
	}
	m = send(m, key("l"), key("enter"))
	clock = testNow.Add(10 * time.Minute)
	m = send(m, key("tab"))
	clock = testNow.Add(15 * time.Minute)
	send(m, key("space"))
	for _, e := range a.Events {
		if e.Kind == progress.Passed && e.Problem == "p-two" {
			if e.Data["elapsed_ms"] != "300000" {
				t.Fatalf("p-two was worked on for 5 minutes, recorded %s ms", e.Data["elapsed_ms"])
			}
			return
		}
	}
	t.Fatal("p-two pass not recorded")
}

func TestFocusShowsSyntaxError(t *testing.T) {
	broken := runner.Result{Total: 1, Tests: []runner.TestResult{{
		Name: "test_problem", Outcome: runner.Errored, Message: "collection failure",
		Detail: "solution.py:1: in <module>\nE     def add(a, b)\nE                  ^\nE   SyntaxError: expected ':'",
	}}}
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{broken}})
	if view := plain(m); !strings.Contains(view, "SyntaxError: expected ':'") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSearchFromFocusReplacesIt(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	m = send(m, key("/"))
	for _, r := range "two sum" {
		m = send(m, key(string(r)))
	}
	m = send(m, key("enter"))
	stack := m.(Model).stack
	if len(stack) != 2 {
		t.Fatalf("stack = %d screens, want home + the new problem", len(stack))
	}
	if f, ok := stack[1].(*Focus); !ok || f.p.ID != "two-sum" {
		t.Fatalf("top = %T", stack[1])
	}
	if count(s, progress.Left) != 1 {
		t.Fatalf("the replaced attempt must end: %v", kinds(s))
	}
}

func TestInterviewHintsExcludeKeyIdea(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{results: []runner.Result{red}})
	s.Prompts = fakePrompts{md: "Add two numbers.", status: prompt.Fetched}
	p, _ := s.App.Catalog.Problem("p-one")
	f := newFocus(s, p, progress.Interview)
	f.statement = "Add two numbers."
	if hints := f.hintList(); len(hints) != 1 {
		t.Fatalf("interview hints must not reveal the key idea: %v", hints)
	}
}

func TestDiffAgainstPreviousVersion(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	path := s.App.Workspace.AttemptPath("p-one")
	os.WriteFile(path, []byte("old line\n"), 0o644)
	s.App.Workspace.Snapshot("p-one", testNow)
	os.WriteFile(path, []byte("new line\n"), 0o644)
	s.App.Workspace.Snapshot("p-one", testNow.Add(time.Minute))
	view := plain(send(m, key("d")))
	if !strings.Contains(view, "-old line") || !strings.Contains(view, "+new line") {
		t.Fatalf("diff should compare with the last different version:\n%s", view)
	}
}

func TestQDuringResetConfirmDoesNotQuit(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	m = send(m, key("r"))
	_, cmd := m.Update(key("q"))
	if cmd != nil {
		if _, quit := cmd().(tea.QuitMsg); quit {
			t.Fatal("q answers the reset prompt; it must not quit the app")
		}
	}
}

func TestZeroHeightWithStatusDoesNotPanic(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	s.Status = "something"
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 0, Height: 0})
	_ = m.View()
}

func TestStaleRunIsIgnored(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	f := m.(Model).top().(*Focus)
	touch(t, s, "p-one")
	send(m, key("space"))                                       // run #2 (red)
	send(m, runDoneMsg{f: f, res: green, logged: true, seq: 1}) // a late result from run #1
	if count(s, progress.Passed) != 0 {
		t.Fatal("a stale result must not count as a pass")
	}
}

func TestPythonMissingBanner(t *testing.T) {
	a := newTestApp(t)
	a.PythonErr = errors.New("no python found: run `uv sync` in the repo")
	m := send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 100, Height: 24})
	if !strings.Contains(plain(m), "uv sync") {
		t.Fatalf("view:\n%s", plain(m))
	}
}

func TestFocusNarrowShowsChecklist(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	m = send(m, key("1"))
	if view := plain(m); !strings.Contains(view, "say it aloud") || !strings.Contains(view, "[x] brute force") {
		t.Fatalf("narrow focus must show the checklist:\n%s", view)
	}
}

func TestPassCardIsGreen(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red, green}})
	touch(t, s, "p-one")
	m = send(m, key("space"))
	if raw := m.View().Content; !strings.Contains(raw, s.Theme.Pass.Render("╭─ ")) {
		t.Fatalf("the pass card border should be green:\n%q", raw)
	}
}

func TestInterviewSetupDigitsPickCount(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("3"), key("3"))
	iv, ok := m.(Model).top().(*Interview)
	if !ok || iv.n != 3 {
		t.Fatalf("3 on the setup screen picks three problems, top=%T", m.(Model).top())
	}
}

func TestSelfCheckKeepsTabKeys(t *testing.T) {
	m, s, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	s.App.Now = func() time.Time { return testNow.Add(46 * time.Minute) }
	m = send(m, interviewTickMsg{iv}, key("5"), key("tab"))
	if _, ok := m.(Model).top().(*Interview); !ok || iv.phase != phaseSelfCheck {
		t.Fatalf("tab keys must not leave the self-check before the reveal, top=%T", m.(Model).top())
	}
}

func TestRoundKeyBarStartsWithEdit(t *testing.T) {
	m, _, _ := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	if !strings.Contains(lastLine(plain(m)), "e edit") {
		t.Fatalf("key bar:\n%s", lastLine(plain(m)))
	}
}

func TestSpinnerOneLoopPerRun(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	f := m.(Model).top().(*Focus)
	s.Spin = func() tea.Cmd { return func() tea.Msg { return nil } }
	f.running = true
	if cmd := f.run(false); cmd != nil {
		if msg, ok := cmd().(tea.BatchMsg); ok {
			for _, c := range msg {
				if c == nil {
					continue
				}
				if _, spin := c().(spinMsg); spin {
					t.Fatal("a run started while another is in flight must not start a second spinner loop")
				}
			}
		}
	}
}

func TestFailCardStaysWhileRerunning(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	m.(Model).top().(*Focus).running = true
	if !strings.Contains(plain(m), "assert 4 == 0") {
		t.Fatal("the last failure should stay on screen while tests rerun")
	}
}

func TestHelpModalFitsShortTerminal(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	view := plain(send(m, tea.WindowSizeMsg{Width: 60, Height: 20}, key("?")))
	if !strings.Contains(view, "╰") {
		t.Fatalf("help modal must keep its bottom border:\n%s", view)
	}
}
