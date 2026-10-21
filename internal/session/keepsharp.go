package session

import (
	"cmp"
	"slices"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
)

// coldDays is how long since the last finish before a problem is a "cold redo".
const coldDays = 7

type sharpCand struct {
	p      *catalog.Problem
	st     schedule.State
	score  float64
	reason Reason
	today  bool // finished earlier today
}

// pickKeepSharp builds an interview-ready drill queue when reviews and new work
// are empty. Curriculum only; prefers cold / shaky problems and spreads techniques.
func pickKeepSharp(c *catalog.Catalog, states map[string]schedule.State, today time.Time, slots int) []Item {
	if slots <= 0 {
		return nil
	}
	day := midnight(today)
	var pool []sharpCand
	for _, p := range c.Curriculum() {
		st, ok := states[p.ID]
		if !ok || st.Status == schedule.Unseen {
			continue
		}
		if !st.Due.After(day) {
			continue // due reviews belong in the normal queue
		}
		daysAgo := 0
		finishedToday := false
		if !st.LastFinished.IsZero() {
			last := st.LastFinished.In(today.Location())
			daysAgo = daysBetween(last, day)
			finishedToday = midnight(last).Equal(day)
		}
		struggle := 0.0
		if st.Attempts > 0 {
			struggle = float64(st.Attempts-st.CleanPasses) / float64(st.Attempts)
		}
		reason := ReasonInterviewMix
		score := float64(daysAgo) + struggle*8
		switch {
		case daysAgo >= coldDays:
			reason = ReasonColdRedo
			score += 6
		case struggle >= weakShare || st.Fails > 0:
			reason = ReasonKeepSharp
			score += 4
		}
		// Slight preference for medium — the usual interview difficulty.
		if p.Difficulty == catalog.Medium {
			score += 1
		}
		pool = append(pool, sharpCand{p: p, st: st, score: score, reason: reason, today: finishedToday})
	}
	if len(pool) == 0 {
		return nil
	}

	var primary, todayDone []sharpCand
	for _, cand := range pool {
		if cand.today {
			todayDone = append(todayDone, cand)
		} else {
			primary = append(primary, cand)
		}
	}
	if len(primary) == 0 {
		primary = todayDone
	}
	slices.SortStableFunc(primary, func(a, b sharpCand) int {
		if a.score != b.score {
			return cmp.Compare(b.score, a.score)
		}
		return a.p.Order - b.p.Order
	})

	var out []Item
	usedTech := map[*catalog.Technique]bool{}
	taken := map[string]bool{}
	add := func(cand sharpCand) {
		if taken[cand.p.ID] || len(out) >= slots {
			return
		}
		taken[cand.p.ID] = true
		out = append(out, Item{Problem: cand.p, Kind: Practice, State: cand.st, Reason: cand.reason})
	}
	// Pass 1: one problem per technique (interview-mix shape).
	for _, cand := range primary {
		if usedTech[cand.p.Technique] {
			continue
		}
		usedTech[cand.p.Technique] = true
		add(cand)
	}
	// Pass 2: fill remaining slots by score.
	for _, cand := range primary {
		add(cand)
	}
	return out
}
