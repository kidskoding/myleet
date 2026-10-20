package session

import (
	"cmp"
	"slices"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
)

type Kind string

const (
	Review Kind = "review"
	New    Kind = "new"
)

// Reason says why a new problem was picked, so the plan reads as personal.
type Reason string

const (
	ReasonWeak       Reason = "weak spot"
	ReasonInProgress Reason = "in progress"
	ReasonNewTopic   Reason = "new topic"
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
	return append(reviews, pickNew(c, states, max(0, newPerDay-startedToday))...)
}

type candidate struct {
	unseen   []*catalog.Problem
	reason   Reason
	struggle float64
}

func pickNew(c *catalog.Catalog, states map[string]schedule.State, slots int) []Item {
	var started, untouched []*candidate
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
	order := append(started, untouched...)

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
