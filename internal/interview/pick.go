package interview

import (
	"math/rand"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
)

const (
	RoundLength = 45 * time.Minute
	HintPenalty = 3 * time.Minute
	failWindow  = 14 * 24 * time.Hour
	mixedModule = "mixed_interview_practice"
)

func weight(p *catalog.Problem, st schedule.State, seen, recentFail bool) float64 {
	w := 2.0
	if seen && st.Status != schedule.Unseen {
		w = [...]float64{3, 2, 1, 0.5, 0.5}[min(max(st.Rung, 0), 4)]
	}
	if recentFail {
		w *= 2
	}
	if p.Technique.Module.ID == mixedModule {
		w *= 2
	}
	return w
}

func Pick(c *catalog.Catalog, states map[string]schedule.State, attempts []schedule.Attempt, n int, now time.Time, rng *rand.Rand) []*catalog.Problem {
	recent := map[string]bool{}
	for _, a := range attempts {
		if a.Outcome == schedule.OutcomeFail && now.Sub(a.End) <= failWindow {
			recent[a.Problem] = true
		}
	}
	problems := c.Curriculum()
	weights := make([]float64, len(problems))
	for i, p := range problems {
		st, seen := states[p.ID]
		weights[i] = weight(p, st, seen, recent[p.ID])
	}
	taken := make([]bool, len(problems))
	usedTech := map[*catalog.Technique]bool{}
	var out []*catalog.Problem
	for len(out) < n {
		pick := sample(weights, func(i int) bool { return !taken[i] && !usedTech[problems[i].Technique] }, rng)
		if pick < 0 {
			pick = sample(weights, func(i int) bool { return !taken[i] }, rng)
		}
		if pick < 0 {
			break
		}
		taken[pick] = true
		usedTech[problems[pick].Technique] = true
		out = append(out, problems[pick])
	}
	return out
}

func sample(weights []float64, ok func(int) bool, rng *rand.Rand) int {
	total := 0.0
	for i, w := range weights {
		if ok(i) {
			total += w
		}
	}
	if total == 0 {
		return -1
	}
	r := rng.Float64() * total
	last := -1
	for i, w := range weights {
		if !ok(i) {
			continue
		}
		last = i
		if r < w {
			return i
		}
		r -= w
	}
	return last
}
