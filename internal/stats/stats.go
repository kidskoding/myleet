package stats

import (
	"slices"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
)

const (
	minAttemptsForWeakness = 3
	maxWeakest             = 5
	dayFormat              = "2006-01-02"
)

type TechniqueScore struct {
	Technique          *catalog.Technique
	FailRate, HintRate float64
	Attempts           int
}

type Summary struct {
	Counts       map[schedule.Status]int
	Streak       int
	Heatmap      map[string]int
	Weakest      []TechniqueScore
	MedianByDiff map[catalog.Difficulty]time.Duration
}

func Compute(c *catalog.Catalog, states map[string]schedule.State, attempts []schedule.Attempt, now time.Time, loc *time.Location) Summary {
	s := Summary{Counts: map[schedule.Status]int{}, Heatmap: map[string]int{}, MedianByDiff: map[catalog.Difficulty]time.Duration{}}
	for _, p := range c.Problems() {
		st, ok := states[p.ID]
		if !ok || st.Status == "" {
			st.Status = schedule.Unseen
		}
		s.Counts[st.Status]++
	}

	type tally struct{ attempts, fails, hinted int }
	byTech := map[*catalog.Technique]*tally{}
	times := map[catalog.Difficulty][]time.Duration{}
	for _, a := range attempts {
		p, ok := c.Problem(a.Problem)
		if !ok || a.Outcome == schedule.OutcomeNone {
			continue
		}
		t := byTech[p.Technique]
		if t == nil {
			t = &tally{}
			byTech[p.Technique] = t
		}
		t.attempts++
		if a.Outcome == schedule.OutcomeFail {
			t.fails++
		}
		if a.Hints > 0 {
			t.hinted++
		}
		if a.Outcome == schedule.OutcomePass {
			s.Heatmap[a.End.In(loc).Format(dayFormat)]++
			times[p.Difficulty] = append(times[p.Difficulty], a.Elapsed)
		}
	}

	day := now.In(loc)
	if s.Heatmap[day.Format(dayFormat)] == 0 {
		day = day.AddDate(0, 0, -1)
	}
	for s.Heatmap[day.Format(dayFormat)] > 0 {
		s.Streak++
		day = day.AddDate(0, 0, -1)
	}

	for tech, t := range byTech {
		if t.attempts < minAttemptsForWeakness || t.fails+t.hinted == 0 {
			continue
		}
		s.Weakest = append(s.Weakest, TechniqueScore{
			Technique: tech, Attempts: t.attempts,
			FailRate: float64(t.fails) / float64(t.attempts), HintRate: float64(t.hinted) / float64(t.attempts),
		})
	}
	slices.SortFunc(s.Weakest, func(a, b TechniqueScore) int {
		if d := (b.FailRate + b.HintRate) - (a.FailRate + a.HintRate); d != 0 {
			if d > 0 {
				return 1
			}
			return -1
		}
		return b.Attempts - a.Attempts
	})
	s.Weakest = s.Weakest[:min(len(s.Weakest), maxWeakest)]

	for diff, ds := range times {
		slices.Sort(ds)
		s.MedianByDiff[diff] = ds[len(ds)/2]
	}
	return s
}
