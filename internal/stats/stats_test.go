package stats

import (
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func passOn(id string, day int, elapsed time.Duration) schedule.Attempt {
	return schedule.Attempt{Problem: id, Outcome: schedule.OutcomePass, End: tu.Day(day), Elapsed: elapsed}
}

func TestStreak(t *testing.T) {
	c := tu.GoodCatalog(t)
	atts := []schedule.Attempt{passOn("p-one", 19, time.Minute), passOn("p-two", 18, time.Minute), passOn("p-one", 16, time.Minute)}
	if s := Compute(c, nil, atts, tu.Day(19), tu.Chicago); s.Streak != 2 {
		t.Fatalf("streak = %d", s.Streak)
	}
	if s := Compute(c, nil, atts, tu.Day(20), tu.Chicago); s.Streak != 2 {
		t.Fatalf("streak ending yesterday = %d", s.Streak)
	}
	if s := Compute(c, nil, atts, tu.Day(21), tu.Chicago); s.Streak != 0 {
		t.Fatalf("broken streak = %d", s.Streak)
	}
}

func TestSummaryCountsHeatmapMedian(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{"p-one": {Status: schedule.Mastered}, "p-two": {Status: schedule.Learning}}
	atts := []schedule.Attempt{passOn("p-one", 19, 10*time.Minute), passOn("two-sum", 19, 4*time.Minute), passOn("two-sum", 18, 6*time.Minute)}
	s := Compute(c, states, atts, tu.Day(19), tu.Chicago)
	if s.Counts[schedule.Mastered] != 1 || s.Counts[schedule.Learning] != 1 || s.Counts[schedule.Unseen] != 2 {
		t.Fatalf("counts = %v", s.Counts)
	}
	if s.Heatmap["2026-10-19"] != 2 || s.Heatmap["2026-10-18"] != 1 {
		t.Fatalf("heatmap = %v", s.Heatmap)
	}
	if s.MedianByDiff["easy"] != 6*time.Minute {
		t.Fatalf("median easy = %v", s.MedianByDiff["easy"])
	}
}

func TestWeakestNeedsThreeAttempts(t *testing.T) {
	c := tu.GoodCatalog(t)
	fail := schedule.Attempt{Problem: "p-one", Outcome: schedule.OutcomeFail, End: tu.Day(19)}
	hinted := schedule.Attempt{Problem: "p-two", Outcome: schedule.OutcomePass, Hints: 1, End: tu.Day(19)}
	atts := []schedule.Attempt{fail, fail, hinted, passOn("p-three", 19, time.Minute)}
	s := Compute(c, nil, atts, tu.Day(19), tu.Chicago)
	if len(s.Weakest) != 1 || s.Weakest[0].Technique.ID != "one" || s.Weakest[0].Attempts != 3 {
		t.Fatalf("weakest = %+v", s.Weakest)
	}
	if s.Weakest[0].FailRate < 0.66 || s.Weakest[0].HintRate < 0.33 {
		t.Fatalf("rates = %+v", s.Weakest[0])
	}
}

func TestStatsIgnoresUnknownIDs(t *testing.T) {
	c := tu.GoodCatalog(t)
	atts := []schedule.Attempt{passOn("deleted", 19, time.Minute)}
	states := map[string]schedule.State{"deleted": {Status: schedule.Mastered}}
	s := Compute(c, states, atts, tu.Day(19), tu.Chicago)
	if s.Counts[schedule.Mastered] != 0 || s.Streak != 0 {
		t.Fatalf("summary = %+v", s)
	}
}

func TestWeakestSkipsCleanTechniques(t *testing.T) {
	c := tu.GoodCatalog(t)
	atts := []schedule.Attempt{passOn("two-sum", 17, time.Minute), passOn("two-sum", 18, time.Minute), passOn("two-sum", 19, time.Minute)}
	if s := Compute(c, nil, atts, tu.Day(19), tu.Chicago); len(s.Weakest) != 0 {
		t.Fatalf("a technique with no fails or hints is not weak: %+v", s.Weakest)
	}
}

func TestCountsSkipUnseenBankProblems(t *testing.T) {
	c := tu.GoodCatalog(t)
	if s := Compute(c, nil, nil, tu.Day(19), tu.Chicago); s.Counts[schedule.Unseen] != 4 {
		t.Fatalf("unseen = %d, want 4 (the bank's untouched problems are not counted)", s.Counts[schedule.Unseen])
	}
	states := map[string]schedule.State{"logger-rate-limiter": {Status: schedule.Learning}}
	if s := Compute(c, states, nil, tu.Day(19), tu.Chicago); s.Counts[schedule.Learning] != 1 {
		t.Fatal("a started bank problem counts")
	}
}
