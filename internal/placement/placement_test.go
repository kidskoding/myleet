package placement

import (
	"path/filepath"
	"testing"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func TestResolvePrefersExistingProblems(t *testing.T) {
	c := tu.GoodCatalog(t)
	items := Resolve(c, []Slot{
		{Topic: "arrays", Prefer: []string{"missing", "two-sum"}},
		{Topic: "other", Prefer: []string{"nope"}},
	})
	if len(items) != 1 || items[0].Problem.ID != "two-sum" {
		t.Fatalf("got %+v", items)
	}
}

func TestNeedsAndDone(t *testing.T) {
	if !Needs(nil, nil) {
		t.Fatal("a brand new learner needs placement")
	}
	done := []progress.Event{{Kind: progress.PlacementDone, Data: map[string]string{"skipped": "1"}}}
	if Needs(done, nil) || !Done(done) {
		t.Fatal("skipped placement should not re-prompt")
	}
	if Needs(nil, []schedule.Attempt{{Outcome: schedule.OutcomeFail}}) {
		// fails from leaving still need placement; only a pass opts out
	}
	if !Needs(nil, []schedule.Attempt{{Outcome: schedule.OutcomeFail}}) {
		t.Fatal("leaving without a pass should still prompt placement")
	}
	if Needs(nil, []schedule.Attempt{{Outcome: schedule.OutcomePass}}) {
		t.Fatal("someone with a practice pass does not need placement")
	}
}

func TestEncodeLoadRoundTrip(t *testing.T) {
	items := []ItemResult{
		{Topic: "trees", ProblemID: "invert-binary-tree", ModuleID: "trees", Outcome: OutcomeFailed},
		{Topic: "arrays and hashing", ProblemID: "two-sum", ModuleID: "arrays_and_hashing", Outcome: OutcomeClean},
	}
	for i := range items {
		items[i].Level = LevelOf(items[i].Outcome)
	}
	ev := progress.Event{Kind: progress.PlacementDone, Mode: progress.Placement, Data: Encode(items)}
	got, ok := Load([]progress.Event{ev})
	if !ok || len(got.Items) != 2 {
		t.Fatalf("load = %+v ok=%v", got, ok)
	}
	if got.Items[0].Level != LevelStartHere || got.Items[1].Level != LevelStrong {
		t.Fatalf("levels = %+v", got.Items)
	}
	weak := WeakModules(got)
	if !weak["trees"] || weak["arrays_and_hashing"] {
		t.Fatalf("weak modules = %v", weak)
	}
}

func TestScore(t *testing.T) {
	if Score(true, 0, false, false) != OutcomeClean || Score(true, 1, false, false) != OutcomeHinted {
		t.Fatal("pass scoring")
	}
	if Score(true, 0, false, true) != OutcomeHinted {
		t.Fatal("over time should score as shaky, like a hint")
	}
	if Score(false, 0, false, false) != OutcomeFailed || Score(false, 0, true, false) != OutcomeSkipped {
		t.Fatal("fail/skip scoring")
	}
}

func TestDefaultSlotsResolveAgainstCurriculum(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	c, err := catalog.Load(root)
	if err != nil {
		t.Skip(err)
	}
	items := Resolve(c, nil)
	if len(items) != len(DefaultSlots) {
		t.Fatalf("resolved %d of %d slots", len(items), len(DefaultSlots))
	}
}
