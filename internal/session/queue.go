package session

import (
	"cmp"
	"slices"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/checkpoint"
	"github.com/kidskoding/myleet/internal/placement"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
)

type Kind string

const (
	Review   Kind = "review"
	New      Kind = "new"
	Practice Kind = "practice" // keep-sharp drills when the normal queue is empty
)

// Reason says why a new problem was picked, so the plan reads as personal.
type Reason string

const (
	ReasonWeak         Reason = "weak spot"
	ReasonInProgress   Reason = "in progress"
	ReasonNewTopic     Reason = "new topic"
	ReasonKeepSharp    Reason = "keep sharp"
	ReasonInterviewMix Reason = "interview mix"
	ReasonColdRedo     Reason = "cold redo"
)

type Item struct {
	Problem     *catalog.Problem
	Kind        Kind
	State       schedule.State
	OverdueDays int
	Reason      Reason
}

// weakShare is the share of non-clean attempts above which a technique is a weak spot.
const weakShare = 0.5

func midnight(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func daysBetween(from, to time.Time) int {
	return int(midnight(to).Sub(midnight(from)).Hours()+12) / 24
}

// Today lists due reviews, most overdue first, then new problems picked from the
// learner's own history: techniques they started and struggle with, then other
// started techniques, then untouched ones in reading order. New problems rotate
// across techniques, and the slots shrink by new problems already finished today.
func Today(c *catalog.Catalog, states map[string]schedule.State, today time.Time, newPerDay int) []Item {
	return TodayWithEvents(c, states, today, newPerDay, nil)
}

// TodayWithEvents is Today, but weak-spot picking also uses placement and checkpoint results.
// When nothing is due and no new slots remain, it fills a keep-sharp drill queue so a
// caught-up or fully mastered learner still has interview-ready practice.
func TodayWithEvents(c *catalog.Catalog, states map[string]schedule.State, today time.Time, newPerDay int, events []progress.Event) []Item {
	day := midnight(today)
	var reviews []Item
	startedToday := 0
	for _, p := range c.Problems() {
		st, seen := states[p.ID]
		if !seen || st.Status == schedule.Unseen {
			continue
		}
		if !st.FirstFinished.IsZero() && midnight(st.FirstFinished.In(today.Location())).Equal(day) {
			startedToday++
		}
		if !st.Due.After(day) {
			reviews = append(reviews, Item{Problem: p, Kind: Review, State: st, OverdueDays: daysBetween(st.Due.In(today.Location()), day)})
		}
	}
	slices.SortStableFunc(reviews, func(a, b Item) int {
		if a.OverdueDays != b.OverdueDays {
			return b.OverdueDays - a.OverdueDays
		}
		return a.Problem.Order - b.Problem.Order
	})
	out := append(reviews, pickNew(c, states, max(0, newPerDay-startedToday), weakModules(events))...)
	if len(out) > 0 {
		return out
	}
	slots := newPerDay
	if slots <= 0 {
		slots = 3
	}
	return pickKeepSharp(c, states, today, slots)
}

// weakModules merges placement and checkpoint gaps; checkpoint wins on overlap
// by applying second so both sets are unioned (same bool map).
func weakModules(events []progress.Event) map[string]bool {
	out := map[string]bool{}
	if r, ok := placement.Load(events); ok && !r.Skipped {
		for id := range placement.WeakModules(r) {
			out[id] = true
		}
	}
	if r, ok := checkpoint.Load(events); ok {
		for id := range checkpoint.WeakModules(r) {
			out[id] = true
		}
	}
	return out
}

type candidate struct {
	unseen   []*catalog.Problem
	reason   Reason
	struggle float64
}

func pickNew(c *catalog.Catalog, states map[string]schedule.State, slots int, weakMods map[string]bool) []Item {
	var started, untouched, placed []*candidate
	for _, m := range c.Modules {
		if m.Bank {
			continue
		}
		for _, t := range m.Techniques {
			cand := &candidate{reason: ReasonNewTopic}
			attempts, clean, seen := 0, 0, false
			for _, p := range t.Problems {
				st, ok := states[p.ID]
				if !ok || st.Status == schedule.Unseen {
					cand.unseen = append(cand.unseen, p)
					continue
				}
				seen = true
				attempts += st.Attempts
				clean += st.CleanPasses
			}
			if len(cand.unseen) == 0 {
				continue
			}
			if !seen {
				if weakMods[m.ID] {
					cand.reason = ReasonWeak
					cand.struggle = 1
					placed = append(placed, cand)
					continue
				}
				untouched = append(untouched, cand)
				continue
			}
			if attempts > 0 {
				cand.struggle = float64(attempts-clean) / float64(attempts)
			}
			cand.reason = ReasonInProgress
			if cand.struggle >= weakShare {
				cand.reason = ReasonWeak
			}
			started = append(started, cand)
		}
	}
	slices.SortStableFunc(started, func(a, b *candidate) int { return cmp.Compare(b.struggle, a.struggle) })
	slices.SortStableFunc(placed, func(a, b *candidate) int { return cmp.Compare(b.struggle, a.struggle) })
	order := append(placed, append(started, untouched...)...)

	var out []Item
	for round := 0; len(out) < slots; round++ {
		added := false
		for _, cand := range order {
			if round < len(cand.unseen) && len(out) < slots {
				out = append(out, Item{Problem: cand.unseen[round], Kind: New, Reason: cand.reason})
				added = true
			}
		}
		if !added {
			break
		}
	}
	return out
}
