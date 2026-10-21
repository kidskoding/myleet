package session

import (
	"testing"

	"github.com/kidskoding/myleet/internal/checkpoint"
	"github.com/kidskoding/myleet/internal/placement"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func newIDs(items []Item) []string {
	var out []string
	for _, it := range items {
		if it.Kind == New {
			out = append(out, it.Problem.ID)
		}
	}
	return out
}

func TestNewStartsOnePerTechniqueInReadingOrder(t *testing.T) {
	got := newIDs(Today(tu.GoodCatalog(t), nil, tu.Day(19), 3))
	if want := []string{"p-one", "p-three", "two-sum"}; !equal(got, want) {
		t.Fatalf("a fresh start samples one problem per technique: got %v, want %v", got, want)
	}
}

func TestNewPrefersStartedTechniquesYouStruggleWith(t *testing.T) {
	states := map[string]schedule.State{
		// technique "one" is started and shaky: 3 attempts, none clean
		"p-one": {Status: schedule.Learning, Rung: 0, Due: tu.Midnight(25), Attempts: 3, CleanPasses: 0},
		// technique "three" is finished cleanly
		"two-sum": {Status: schedule.Learning, Rung: 1, Due: tu.Midnight(25), Attempts: 1, CleanPasses: 1},
	}
	got := newIDs(Today(tu.GoodCatalog(t), states, tu.Day(19), 2))
	if want := []string{"p-two", "p-three"}; !equal(got, want) {
		t.Fatalf("started, shaky techniques come first, then untouched ones: got %v, want %v", got, want)
	}
}

func equal(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestNewPrefersModulesFromPlacement(t *testing.T) {
	c := tu.GoodCatalog(t)
	events := []progress.Event{{
		Kind: progress.PlacementDone, Mode: progress.Placement,
		Data: placement.Encode([]placement.ItemResult{
			{Topic: "beta", ProblemID: "two-sum", ModuleID: "beta", Outcome: placement.OutcomeFailed},
		}),
	}}
	got := newIDs(TodayWithEvents(c, nil, tu.Day(19), 3, events))
	if want := []string{"two-sum", "p-one", "p-three"}; !equal(got, want) {
		t.Fatalf("placement weak modules should lead: got %v, want %v", got, want)
	}
	if TodayWithEvents(c, nil, tu.Day(19), 1, events)[0].Reason != ReasonWeak {
		t.Fatal("placement-boosted problems should be labeled weak spot")
	}
}

func TestNewPrefersModulesFromCheckpoint(t *testing.T) {
	c := tu.GoodCatalog(t)
	events := []progress.Event{{
		Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
		Data: checkpoint.Encode(2, []checkpoint.ItemResult{
			{Topic: "Beta", ProblemID: "two-sum", ModuleID: "beta", Outcome: checkpoint.OutcomeFailed},
		}),
	}}
	got := newIDs(TodayWithEvents(c, nil, tu.Day(19), 3, events))
	if want := []string{"two-sum", "p-one", "p-three"}; !equal(got, want) {
		t.Fatalf("checkpoint weak modules should lead: got %v, want %v", got, want)
	}
}
