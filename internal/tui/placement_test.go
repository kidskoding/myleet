package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/placement"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/runner"
	"github.com/kidskoding/myleet/internal/schedule"
)

func placementModel(t *testing.T, fr *fakeRunner) (tea.Model, *Shared, *Placement) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), fr)
	pl := &Placement{s: s, slots: []placement.Slot{
		{Topic: "arrays", Prefer: []string{"p-one"}},
		{Topic: "hashing", Prefer: []string{"two-sum"}},
	}}
	// Intro enter still starts the round (fallback path); Today uses NewPlacementStart.
	m := Model{s: s, stack: []Screen{NewHome(s), pl}, width: 80, height: 24}
	return send(m, tea.WindowSizeMsg{Width: 80, Height: 24}, key("enter")), s, pl
}

func TestPlacementRoundHidesTechnique(t *testing.T) {
	m, _, pl := placementModel(t, &fakeRunner{results: []runner.Result{red}})
	if pl.phase != placeRound {
		t.Fatalf("phase = %d", pl.phase)
	}
	view := plain(m)
	if !strings.Contains(view, "??? hidden") || !strings.Contains(view, "arrays · 1 of 2") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestPlacementSubmitScoresAndReveals(t *testing.T) {
	m, s, pl := placementModel(t, &fakeRunner{results: []runner.Result{green, red}})
	m = send(m, key("space"), key("space"))
	if pl.phase != placeReveal {
		t.Fatalf("phase = %d outcomes=%v", pl.phase, pl.outcomes)
	}
	if pl.outcomes[0] != placement.OutcomeClean || pl.outcomes[1] != placement.OutcomeFailed {
		t.Fatalf("outcomes = %v", pl.outcomes)
	}
	view := plain(m)
	if !strings.Contains(view, "your placement results") || !strings.Contains(view, "strong") || !strings.Contains(view, "start here") {
		t.Fatalf("view:\n%s", view)
	}
	if !placement.Done(s.App.Events) {
		t.Fatal("placement_done should be recorded")
	}
	for _, a := range s.App.Attempts() {
		if a.Outcome != schedule.OutcomeNone {
			t.Fatalf("placement must not create ladder attempts: %+v", a)
		}
	}
	for _, e := range s.App.Events {
		switch e.Kind {
		case progress.Passed, progress.GaveUp, progress.Left, progress.Opened, progress.TestRun:
			if e.Mode != progress.Placement {
				t.Fatalf("%s mode = %q", e.Kind, e.Mode)
			}
		}
	}
}

func TestPlacementSkipTopic(t *testing.T) {
	m, _, pl := placementModel(t, &fakeRunner{results: []runner.Result{red, red}})
	send(m, key("n"), key("n"))
	if pl.phase != placeReveal || pl.outcomes[0] != placement.OutcomeSkipped || pl.outcomes[1] != placement.OutcomeSkipped {
		t.Fatalf("phase=%d outcomes=%v", pl.phase, pl.outcomes)
	}
}

func TestPlacementIntroSkip(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	pl := &Placement{s: s}
	m := send(Model{s: s, stack: []Screen{NewHome(s), pl}, width: 80, height: 24},
		tea.WindowSizeMsg{Width: 80, Height: 24}, key("n"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("skip from intro should return home")
	}
	if r, ok := placement.Load(s.App.Events); !ok || !r.Skipped {
		t.Fatalf("skip should persist: %+v ok=%v", r, ok)
	}
}

func TestPlacementRevealToastsHandoff(t *testing.T) {
	m, s, pl := placementModel(t, &fakeRunner{results: []runner.Result{green, red}})
	m = send(m, key("space"), key("space"))
	if pl.phase != placeReveal {
		t.Fatalf("phase = %d", pl.phase)
	}
	m = send(m, key("enter"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("enter should return to Today")
	}
	if s.toast == "" || (!strings.Contains(s.toast, "plan") && !strings.Contains(s.toast, "start")) {
		t.Fatalf("toast = %q", s.toast)
	}
}

func TestNewPlacementStartSkipsIntro(t *testing.T) {
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	pl, cmd := NewPlacementStart(s)
	if pl.phase != placeRound {
		t.Fatalf("phase = %d", pl.phase)
	}
	if len(pl.foci) == 0 {
		t.Fatal("round should have problems")
	}
	_ = cmd
}
