package tui

import (
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
)

// clockedFocus opens p-one with a clock the test can move.
func clockedFocus(t *testing.T, results ...runner.Result) (tea.Model, *Shared, *Focus, *time.Time) {
	t.Helper()
	m, s := focusModel(t, "p-one", &fakeRunner{results: results})
	s.Prompts = fakePrompts{md: "Add two numbers.", status: prompt.Fetched}
	now := testNow
	s.App.Now = func() time.Time { return now }
	f := m.(Model).top().(*Focus)
	f.start = now
	return m, s, f, &now
}

func TestPauseStopsClockAndHidesProblem(t *testing.T) {
	m, _, f, now := clockedFocus(t, red)
	f.statement = "Add two numbers."
	*now = now.Add(2 * time.Minute)
	m = send(m, key("p"))
	*now = now.Add(10 * time.Minute)
	if got := f.Elapsed(); got != 2*time.Minute {
		t.Fatalf("paused time must not count, elapsed=%s", got)
	}
	view := plain(m)
	if !strings.Contains(view, "paused") || strings.Contains(view, "Add two numbers.") {
		t.Fatalf("pause should hide the problem:\n%s", view)
	}
	assertFits(t, view, 80, 24)
	m = send(m, key("p"))
	*now = now.Add(time.Minute)
	if got := f.Elapsed(); got != 3*time.Minute {
		t.Fatalf("clock should resume from where it stopped, elapsed=%s", got)
	}
	if !strings.Contains(plain(m), "Add two numbers.") {
		t.Fatal("resume should show the problem again")
	}
}

func TestPausedSaveDoesNotRunTests(t *testing.T) {
	m, _, f, _ := clockedFocus(t, red, green)
	m = send(m, key("p"))
	runs := f.seq
	send(m, fileChangedMsg{f})
	if f.seq != runs {
		t.Fatal("saving while paused must not run tests")
	}
}

func TestRestartTimerConfirmsAndRecords(t *testing.T) {
	m, s, f, now := clockedFocus(t, red)
	*now = now.Add(7 * time.Minute)
	m = send(m, key("R"))
	if view := plain(m); !strings.Contains(view, "restart") {
		t.Fatalf("restart should ask first:\n%s", view)
	}
	m = send(m, key("n"))
	if f.Elapsed() != 7*time.Minute {
		t.Fatal("n should keep the clock")
	}
	send(m, key("R"), key("y"))
	if f.Elapsed() != 0 {
		t.Fatalf("y should zero the clock, elapsed=%s", f.Elapsed())
	}
	if !strings.Contains(strings.Join(kinds(s), ","), string(progress.TimerRestarted)) {
		t.Fatalf("restart must be recorded: %v", kinds(s))
	}
}

func TestExamModesCannotPauseOrRestart(t *testing.T) {
	m, _, iv := interviewModel(t, &fakeRunner{results: []runner.Result{red}})
	f := iv.foci[iv.cur]
	send(m, key("p"), key("R"), key("y"))
	if !f.pausedAt.IsZero() || f.restarted {
		t.Fatal("timed rounds must not pause or restart")
	}
}

func TestTimeUpEndsPracticeAttempt(t *testing.T) {
	m, s, f, now := clockedFocus(t, red, green)
	*now = now.Add(f.p.TimeTarget + time.Second)
	m = send(m, focusTickMsg{f})
	if !f.timeUp || f.Elapsed() != f.p.TimeTarget {
		t.Fatalf("the attempt should end at the target, timeUp=%v elapsed=%s", f.timeUp, f.Elapsed())
	}
	view := plain(m)
	if !strings.Contains(view, "time's up") || strings.Contains(lastLine(view), "e edit") {
		t.Fatalf("time up should show a banner and drop the edit key:\n%s", view)
	}
	runs := f.seq
	m = send(m, key("e"), key("space"), key("p"), fileChangedMsg{f})
	if f.seq != runs || f.paused() {
		t.Fatal("after time's up nothing may edit, rerun or pause")
	}
	gave := 0
	for _, e := range s.App.Events {
		if e.Kind == progress.GaveUp && e.Data["reason"] == "time_up" {
			gave++
		}
		if e.Kind == progress.Passed {
			t.Fatal("a time-up attempt must not pass")
		}
	}
	if gave != 1 {
		t.Fatalf("time up should be recorded once as a miss, got %d", gave)
	}
	send(m, key("esc"))
	if strings.Contains(strings.Join(kinds(s), ","), string(progress.Left)) {
		t.Fatal("leaving after time up must not record a second outcome")
	}
}

func TestPausedClockDoesNotTimeOut(t *testing.T) {
	m, _, f, now := clockedFocus(t, red)
	m = send(m, key("p"))
	*now = now.Add(2 * f.p.TimeTarget)
	send(m, focusTickMsg{f})
	if f.timeUp {
		t.Fatal("paused time must not run out the clock")
	}
}
