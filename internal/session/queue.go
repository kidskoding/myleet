package session

import (
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

type Item struct {
	Problem     *catalog.Problem
	Kind        Kind
	State       schedule.State
	OverdueDays int
}

func midnight(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func daysBetween(from, to time.Time) int {
	return int(midnight(to).Sub(midnight(from)).Hours()+12) / 24
}

// New slots shrink by the new problems already finished today.
func Today(c *catalog.Catalog, states map[string]schedule.State, today time.Time, newPerDay int) []Item {
	day := midnight(today)
	var reviews, fresh []Item
	startedToday := 0
	for _, p := range c.Problems() {
		st, seen := states[p.ID]
		if !seen || st.Status == schedule.Unseen {
			fresh = append(fresh, Item{Problem: p, Kind: New, State: st})
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
	slots := max(0, newPerDay-startedToday)
	return append(reviews, fresh[:min(slots, len(fresh))]...)
}
