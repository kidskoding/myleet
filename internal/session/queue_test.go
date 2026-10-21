package session

import (
	"strings"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func summary(items []Item) string {
	var parts []string
	for _, it := range items {
		parts = append(parts, string(it.Kind)+":"+it.Problem.ID)
	}
	return strings.Join(parts, ",")
}

func TestTodaySkipsUnseenBankProblems(t *testing.T) {
	c := tu.GoodCatalog(t)
	if got := summary(Today(c, nil, tu.Day(19), 10)); strings.Contains(got, "logger-rate-limiter") {
		t.Fatalf("bank problems are never offered as new: %s", got)
	}
	states := map[string]schedule.State{"logger-rate-limiter": {Status: schedule.Learning, Due: tu.Midnight(19)}}
	if got := summary(Today(c, states, tu.Day(19), 0)); got != "review:logger-rate-limiter" {
		t.Fatalf("a due bank problem is still reviewed: %s", got)
	}
}

func TestTodayOrdersReviewsThenNew(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{
		"p-two":   {Status: schedule.Learning, Rung: 0, Due: tu.Midnight(19)},
		"p-three": {Status: schedule.Reviewing, Rung: 2, Due: tu.Midnight(15)},
		"two-sum": {Status: schedule.Learning, Rung: 1, Due: tu.Midnight(22)},
	}
	items := Today(c, states, tu.Day(19), 3)
	if got := summary(items); got != "review:p-three,review:p-two,new:p-one" {
		t.Fatalf("queue = %s", got)
	}
	if items[0].OverdueDays != 4 || items[1].OverdueDays != 0 {
		t.Fatalf("overdue = %d %d", items[0].OverdueDays, items[1].OverdueDays)
	}
}

func TestTodayNewSlotsShrinkAfterStartingNew(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{
		"p-one": {Status: schedule.Learning, Rung: 0, FirstFinished: tu.Day(19).Add(-time.Hour), Due: tu.Midnight(20)},
	}
	if got := summary(Today(c, states, tu.Day(19), 3)); got != "new:p-two,new:p-three" {
		t.Fatalf("queue = %s", got)
	}
	// Daily new slots are used up, but keep-sharp still offers a drill so Today is never a dead end.
	if got := summary(Today(c, states, tu.Day(19), 1)); got != "practice:p-one" {
		t.Fatalf("queue with newPerDay 1 = %q", got)
	}
}

func TestTodayKeepSharpWhenCaughtUp(t *testing.T) {
	c := tu.GoodCatalog(t)
	// Everything seen, nothing due, no new slots left → interview drills across techniques.
	states := map[string]schedule.State{
		"p-one":   {Status: schedule.Mastered, Rung: 3, Attempts: 4, CleanPasses: 4, LastFinished: tu.Day(5), Due: tu.Midnight(25)},
		"p-two":   {Status: schedule.Mastered, Rung: 3, Attempts: 5, CleanPasses: 2, Fails: 2, LastFinished: tu.Day(12), Due: tu.Midnight(25)},
		"p-three": {Status: schedule.Reviewing, Rung: 2, Attempts: 3, CleanPasses: 3, LastFinished: tu.Day(1), Due: tu.Midnight(30)},
		"two-sum": {Status: schedule.Mastered, Rung: 4, Attempts: 2, CleanPasses: 2, LastFinished: tu.Day(10), Due: tu.Midnight(28)},
	}
	items := Today(c, states, tu.Day(19), 3)
	if len(items) != 3 {
		t.Fatalf("want 3 keep-sharp drills, got %s", summary(items))
	}
	techs := map[string]bool{}
	for _, it := range items {
		if it.Kind != Practice {
			t.Fatalf("keep-sharp item should be practice: %s", summary(items))
		}
		techs[it.Problem.Technique.Title] = true
	}
	if len(techs) < 2 {
		t.Fatalf("drills should spread techniques, got %s", summary(items))
	}
	// Cold / shaky work should surface with a keep-sharp reason, not "new topic".
	for _, it := range items {
		switch it.Reason {
		case ReasonKeepSharp, ReasonColdRedo, ReasonInterviewMix:
		default:
			t.Fatalf("unexpected reason %q on %s", it.Reason, it.Problem.ID)
		}
	}
}

func TestTodayIgnoresUnknownIDs(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{"deleted-problem": {Status: schedule.Learning, Due: tu.Midnight(1)}}
	if got := summary(Today(c, states, tu.Day(19), 0)); got != "" {
		t.Fatalf("queue = %q", got)
	}
}

