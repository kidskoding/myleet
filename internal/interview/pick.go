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

func checkpointWeight(p *catalog.Problem, st schedule.State, seen bool) float64 {
	w := 2.0
	switch p.Difficulty {
	case catalog.Easy:
		w = 3.0
	case catalog.Hard:
		w = 1.0
	}
	if !seen || st.Status == schedule.Unseen {
		w *= 1.5
	}
	return w
}

// PickCheckpoint samples a broad-coverage exam through module number `through`.
// Prefer one problem per module in the slice, then fill by technique diversity.
// Soft preference for unseen/easy so the exam is fair.
func PickCheckpoint(c *catalog.Catalog, states map[string]schedule.State, through, n int, rng *rand.Rand) []*catalog.Problem {
	if through <= 0 || n <= 0 {
		return nil
	}
	var pool []*catalog.Problem
	for _, p := range c.Curriculum() {
		m := p.Technique.Module
		if m.Bank || m.ID == mixedModule || m.Number > through {
			continue
		}
		pool = append(pool, p)
	}
	if len(pool) == 0 {
		return nil
	}
	n = min(n, len(pool))
	weights := make([]float64, len(pool))
	for i, p := range pool {
		st, seen := states[p.ID]
		weights[i] = checkpointWeight(p, st, seen)
	}
	taken := make([]bool, len(pool))
	usedMod := map[int]bool{}
	usedTech := map[*catalog.Technique]bool{}
	var out []*catalog.Problem

	// Pass 1: one problem per module.
	for len(out) < n {
		pick := sample(weights, func(i int) bool {
			return !taken[i] && !usedMod[pool[i].Technique.Module.Number]
		}, rng)
		if pick < 0 {
			break
		}
		taken[pick] = true
		usedMod[pool[pick].Technique.Module.Number] = true
		usedTech[pool[pick].Technique] = true
		out = append(out, pool[pick])
	}
	// Pass 2: technique diversity.
	for len(out) < n {
		pick := sample(weights, func(i int) bool {
			return !taken[i] && !usedTech[pool[i].Technique]
		}, rng)
		if pick < 0 {
			break
		}
		taken[pick] = true
		usedTech[pool[pick].Technique] = true
		out = append(out, pool[pick])
	}
	// Pass 3: anything left.
	for len(out) < n {
		pick := sample(weights, func(i int) bool { return !taken[i] }, rng)
		if pick < 0 {
			break
		}
		taken[pick] = true
		out = append(out, pool[pick])
	}
	return out
}

// CheckpointSize is the default problem count for a slice: one per module, capped at 5.
func CheckpointSize(c *catalog.Catalog, through int) int {
	n := 0
	for _, m := range c.Modules {
		if m.Bank || m.ID == mixedModule || m.Number > through {
			continue
		}
		n++
	}
	return min(5, n)
}
