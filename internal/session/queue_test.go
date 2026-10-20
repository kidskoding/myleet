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
	if got := summary(Today(c, states, tu.Day(19), 3)); got != "new:two-sum,new:p-two" {
		t.Fatalf("queue = %s", got)
	}
	if got := summary(Today(c, states, tu.Day(19), 1)); got != "" {
		t.Fatalf("queue with newPerDay 1 = %q", got)
	}
}

func TestTodayIgnoresUnknownIDs(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{"deleted-problem": {Status: schedule.Learning, Due: tu.Midnight(1)}}
	if got := summary(Today(c, states, tu.Day(19), 0)); got != "" {
		t.Fatalf("queue = %q", got)
	}
}
