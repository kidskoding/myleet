package checkpoint

import (
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func TestEncodeLoadRoundTrip(t *testing.T) {
	items := []ItemResult{
		{Topic: "Alpha", ProblemID: "p-one", ModuleID: "alpha", Outcome: OutcomeFailed},
		{Topic: "Beta", ProblemID: "two-sum", ModuleID: "beta", Outcome: OutcomeClean},
	}
	for i := range items {
		items[i].Level = LevelOf(items[i].Outcome)
	}
	ev := progress.Event{Kind: progress.CheckpointDone, Mode: progress.Checkpoint, Data: Encode(1, items)}
	got, ok := Load([]progress.Event{ev})
	if !ok || got.Through != 1 || len(got.Items) != 2 {
		t.Fatalf("load = %+v ok=%v", got, ok)
	}
	weak := WeakModules(got)
	if !weak["alpha"] || weak["beta"] {
		t.Fatalf("weak = %v", weak)
	}
}

func TestDefaultThrough(t *testing.T) {
	c := tu.GoodCatalog(t)
	if n := DefaultThrough(c, nil); n != 1 {
		t.Fatalf("empty = %d", n)
	}
	atts := []schedule.Attempt{{
		Problem: "two-sum", Outcome: schedule.OutcomePass, Mode: progress.Practice,
	}}
	if n := DefaultThrough(c, atts); n != 2 {
		t.Fatalf("pass in beta = %d, want 2", n)
	}
}

func passAt(id string, at time.Time) schedule.Attempt {
	return schedule.Attempt{
		Problem: id, Outcome: schedule.OutcomePass, Mode: progress.Practice,
		Start: at, End: at,
	}
}

func TestSuggestThroughByPracticeCadence(t *testing.T) {
	c := tu.GoodCatalog(t)
	now := tu.Day(19)
	day := func(d int) time.Time { return tu.Day(d) }

	// Fewer than checkInEvery passes: not yet.
	early := []schedule.Attempt{passAt("p-one", day(17)), passAt("p-two", day(18))}
	if n := SuggestThrough(c, nil, early, now); n != 0 {
		t.Fatalf("too early: %d", n)
	}

	// Mid-module alpha after 3 passes: recommend through 1.
	mid := []schedule.Attempt{
		passAt("p-one", day(16)), passAt("p-two", day(17)), passAt("p-three", day(18)),
	}
	if n := SuggestThrough(c, nil, mid, now); n != 1 {
		t.Fatalf("mid-module should recommend frontier: %d", n)
	}

	// Across modules: frontier is beta.
	across := append(mid, passAt("two-sum", day(19)))
	if n := SuggestThrough(c, nil, across, now); n != 2 {
		t.Fatalf("multi-module frontier: %d", n)
	}
}

func TestSuggestThroughResetsAfterCheckpointOrSnooze(t *testing.T) {
	c := tu.GoodCatalog(t)
	now := tu.Day(19)
	atts := []schedule.Attempt{
		passAt("p-one", tu.Day(10)), passAt("p-two", tu.Day(11)), passAt("p-three", tu.Day(12)),
	}
	done := []progress.Event{{
		Time: tu.Day(13), Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
		Data: Encode(1, nil),
	}}
	if n := SuggestThrough(c, done, atts, now); n != 0 {
		t.Fatalf("passes before checkpoint should not count: %d", n)
	}
	// Three more passes after the checkpoint.
	atts = append(atts,
		passAt("p-one", tu.Day(14)), passAt("p-two", tu.Day(15)), passAt("two-sum", tu.Day(16)),
	)
	if n := SuggestThrough(c, done, atts, now); n != 2 {
		t.Fatalf("after more practice, recommend again: %d", n)
	}
	snooze := append(done, progress.Event{
		Time: tu.Day(17), Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
		Data: Snooze(2),
	})
	if n := SuggestThrough(c, snooze, atts, now); n != 0 {
		t.Fatalf("snooze resets cadence: %d", n)
	}
}

func TestScore(t *testing.T) {
	if Score(true, 0, false) != OutcomeClean || Score(true, 1, false) != OutcomeHinted {
		t.Fatal("pass scoring")
	}
	if Score(false, 0, false) != OutcomeFailed || Score(false, 0, true) != OutcomeSkipped {
		t.Fatal("fail/skip scoring")
	}
}
