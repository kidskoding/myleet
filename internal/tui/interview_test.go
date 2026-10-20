package tui

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/runner"
)

// interviewModel opens the simulator and starts a one-problem round on p-one.
func interviewModel(t *testing.T, fr *fakeRunner) (tea.Model, *Shared, *Interview) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), fr)
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("i"))
	iv := m.(Model).top().(*Interview)
	iv.pick = func(n int) []*catalog.Problem {
		p, _ := s.App.Catalog.Problem("p-one")
		return []*catalog.Problem{p}
	}
	return send(m, key("enter")), s, iv
}

func TestInterviewHidesTechnique(t *testing.T) {
	m, _, _ := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	view := plain(m)
	if !strings.Contains(view, "??? hidden") || !strings.Contains(view, "problem 1 of 1") {
		t.Fatalf("view:\n%s", view)
	}
	for _, leak := range []string{"alpha", "Alpha", "· one ·", "Key idea"} {
		if strings.Contains(view, leak) {
			t.Fatalf("view leaks %q:\n%s", leak, view)
		}
	}
	assertFits(t, view, 80, 24)
}

func TestInterviewHintPenalty(t *testing.T) {
	m, _, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	before := iv.remaining()
	send(m, key("t"))
	if got := before - iv.remaining(); got != 3*time.Minute {
		t.Fatalf("penalty = %v", got)
	}
}

func TestInterviewSubmitGreenRecordsPass(t *testing.T) {
	m, s, iv := interviewModel(t, &fakeRunner{results: []runner.Result{green}})
	m = send(m, key("space"))
	if count(s, progress.Passed) != 1 || s.App.Events[len(s.App.Events)-1].Mode != progress.Interview {
		t.Fatalf("events = %v", kinds(s))
	}
	if iv.phase != phaseSelfCheck || !strings.Contains(plain(m), "restated") {
		t.Fatalf("phase = %d view:\n%s", iv.phase, plain(m))
	}
}

func TestInterviewTimeoutGivesUp(t *testing.T) {
	m, s, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	s.App.Now = func() time.Time { return testNow.Add(46 * time.Minute) }
	send(m, interviewTickMsg{iv})
	if count(s, progress.GaveUp) != 1 || iv.phase != phaseSelfCheck {
		t.Fatalf("events = %v phase = %d", kinds(s), iv.phase)
	}
	if count(s, progress.Left) != 0 {
		t.Fatal("interview problems must not record left")
	}
}

func TestInterviewRevealShowsTechnique(t *testing.T) {
	m, s, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	s.App.Now = func() time.Time { return testNow.Add(46 * time.Minute) }
	m = send(m, interviewTickMsg{iv}, key("2"), key("enter"))
	view := plain(m)
	if iv.phase != phaseReveal || !strings.Contains(view, "Alpha · One") || !strings.Contains(view, "P One") {
		t.Fatalf("view:\n%s", view)
	}
	if count(s, progress.SayAloudChecked) != 1 {
		t.Fatal("self-check toggle not recorded")
	}
	m = send(m, key("enter"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("enter on reveal should return home")
	}
}

func TestInterviewQuitAsks(t *testing.T) {
	m, s, _ := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	m = send(m, key("q"))
	if !strings.Contains(plain(m), "╭─ abandon round") {
		t.Fatalf("view:\n%s", plain(m))
	}
	m = send(m, key("y"))
	if _, ok := m.(Model).top().(*Home); !ok || count(s, progress.GaveUp) != 1 {
		t.Fatalf("abandon should give up and return home: %v", kinds(s))
	}
}

func TestInterviewStartsFromStarter(t *testing.T) {
	a := newTestApp(t)
	path := a.Workspace.AttemptPath("p-one")
	os.MkdirAll(filepath.Dir(path), 0o755)
	os.WriteFile(path, []byte("def add(a, b):\n    return a + b\n"), 0o644)
	s := newTestShared(t, a, &fakeRunner{results: []runner.Result{red}})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("i"))
	iv := m.(Model).top().(*Interview)
	iv.pick = func(int) []*catalog.Problem { p, _ := a.Catalog.Problem("p-one"); return []*catalog.Problem{p} }
	send(m, key("enter"))
	if b, _ := os.ReadFile(path); !strings.Contains(string(b), "NotImplementedError") {
		t.Fatalf("interviews always start cold, got %q", b)
	}
}

func twoProblemRound(t *testing.T) (tea.Model, *Shared, *Interview) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), &fakeRunner{results: []runner.Result{red}})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 100, Height: 30}, key("3"))
	iv := m.(Model).top().(*Interview)
	iv.pick = func(int) []*catalog.Problem {
		one, _ := s.App.Catalog.Problem("p-one")
		two, _ := s.App.Catalog.Problem("p-two")
		return []*catalog.Problem{one, two}
	}
	return send(m, key("l"), key("enter")), s, iv
}

func TestInterviewSetupCard(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("3"))
	view := plain(m)
	if !strings.Contains(view, "╭─ mock interview") || !strings.Contains(view, "[1]") || !strings.Contains(view, "[3]") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestInterviewStepper(t *testing.T) {
	m, _, _ := twoProblemRound(t)
	if view := plain(m); !strings.Contains(view, "● ○  problem 1 of 2") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestInterviewCountdownRedUnder5(t *testing.T) {
	m, s, _ := twoProblemRound(t)
	s.App.Now = func() time.Time { return testNow.Add(41 * time.Minute) }
	want := s.Theme.Fail.Bold(true).Render("04:00 remaining")
	if raw := m.View().Content; !strings.Contains(raw, want) {
		t.Fatalf("countdown under 5 minutes should be red:\n%q", raw)
	}
}

func TestInterviewRevealCards(t *testing.T) {
	m, s, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	s.App.Now = func() time.Time { return testNow.Add(46 * time.Minute) }
	m = send(m, interviewTickMsg{iv}, key("enter"))
	if view := plain(m); !strings.Contains(view, "╭─ P One") || !strings.Contains(view, "not passed") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestInterviewGoldens(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	setup := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("3"))
	assertGolden(t, "interview_setup", plain(setup))
	round, _, _ := twoProblemRound(t)
	assertGolden(t, "interview_round", plain(round))
}
