// Package placement is the live diagnostic that tells a new learner where to start.
package placement

import (
	"strings"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
)

type Outcome string

const (
	OutcomeClean   Outcome = "clean"
	OutcomeHinted  Outcome = "hinted"
	OutcomeFailed  Outcome = "failed"
	OutcomeSkipped Outcome = "skipped"
)

type Level string

const (
	LevelStrong    Level = "strong"
	LevelShaky     Level = "shaky"
	LevelStartHere Level = "start here"
)

// Slot is one topic in the diagnostic; Prefer lists problem ids, first match wins.
type Slot struct {
	Topic  string
	Prefer []string
}

// DefaultSlots covers the core interview families without becoming a full mock.
var DefaultSlots = []Slot{
	{Topic: "arrays and hashing", Prefer: []string{"two-sum", "contains-duplicate", "valid-anagram"}},
	{Topic: "two pointers", Prefer: []string{"valid-palindrome", "move-zeroes", "remove-duplicates-from-sorted-array"}},
	{Topic: "trees", Prefer: []string{"invert-binary-tree", "maximum-depth-of-binary-tree", "same-tree"}},
	{Topic: "graphs", Prefer: []string{"number-of-islands", "flood-fill", "find-if-path-exists-in-graph"}},
	{Topic: "binary search", Prefer: []string{"binary-search", "search-insert-position", "guess-number-higher-or-lower"}},
}

type Item struct {
	Topic   string
	Problem *catalog.Problem
}

type ItemResult struct {
	Topic     string
	ProblemID string
	ModuleID  string
	Outcome   Outcome
	Level     Level
}

type Result struct {
	Skipped bool
	Items   []ItemResult
}

// Score grades one warm-up problem. Over time matches a hint: still a pass, but
// not "strong", since interviews care about finishing under the target.
func Score(passed bool, hints int, skipped, overTime bool) Outcome {
	switch {
	case skipped:
		return OutcomeSkipped
	case !passed:
		return OutcomeFailed
	case hints > 0 || overTime:
		return OutcomeHinted
	default:
		return OutcomeClean
	}
}

func LevelOf(o Outcome) Level {
	switch o {
	case OutcomeClean:
		return LevelStrong
	case OutcomeHinted:
		return LevelShaky
	default:
		return LevelStartHere
	}
}

// Resolve picks one existing curriculum problem per slot.
func Resolve(c *catalog.Catalog, slots []Slot) []Item {
	if slots == nil {
		slots = DefaultSlots
	}
	var out []Item
	for _, slot := range slots {
		for _, id := range slot.Prefer {
			if p, ok := c.Problem(id); ok && !p.Technique.Module.Bank {
				out = append(out, Item{Topic: slot.Topic, Problem: p})
				break
			}
		}
	}
	return out
}

// Needs reports whether the learner should see the placement prompt.
// Opening and leaving problems does not count: only a practice pass, or an
// already finished/skipped diagnostic, suppresses it.
func Needs(events []progress.Event, attempts []schedule.Attempt) bool {
	if Done(events) {
		return false
	}
	for _, a := range attempts {
		if a.Outcome == schedule.OutcomePass {
			return false
		}
	}
	return true
}

// Done is true after a finished or skipped diagnostic.
func Done(events []progress.Event) bool {
	for _, e := range events {
		if e.Kind == progress.PlacementDone {
			return true
		}
	}
	return false
}

// Load reconstructs the last placement result from events.
func Load(events []progress.Event) (Result, bool) {
	for i := len(events) - 1; i >= 0; i-- {
		e := events[i]
		if e.Kind != progress.PlacementDone {
			continue
		}
		if e.Data["skipped"] == "1" {
			return Result{Skipped: true}, true
		}
		raw := e.Data["results"]
		if raw == "" {
			return Result{}, true
		}
		var items []ItemResult
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			bits := strings.Split(part, ":")
			if len(bits) != 4 {
				continue
			}
			o := Outcome(bits[2])
			items = append(items, ItemResult{
				Topic: bits[0], ProblemID: bits[1], Outcome: o, Level: LevelOf(o), ModuleID: bits[3],
			})
		}
		return Result{Items: items}, true
	}
	return Result{}, false
}

// Encode packs results for a PlacementDone event.
func Encode(items []ItemResult) map[string]string {
	parts := make([]string, 0, len(items))
	for _, it := range items {
		topic := strings.ReplaceAll(it.Topic, ":", " ")
		parts = append(parts, strings.Join([]string{topic, it.ProblemID, string(it.Outcome), it.ModuleID}, ":"))
	}
	return map[string]string{"results": strings.Join(parts, ",")}
}

// WeakModules are module ids the learner should drill first after placement.
func WeakModules(r Result) map[string]bool {
	out := map[string]bool{}
	for _, it := range r.Items {
		if it.Level == LevelStartHere || it.Level == LevelShaky {
			if it.ModuleID != "" {
				out[it.ModuleID] = true
			}
		}
	}
	return out
}

// Recommend returns the first start-here module, else the first shaky one.
func Recommend(c *catalog.Catalog, r Result) *catalog.Module {
	var shaky *catalog.Module
	for _, it := range r.Items {
		p, ok := c.Problem(it.ProblemID)
		if !ok {
			continue
		}
		mod := p.Technique.Module
		if it.Level == LevelStartHere {
			return mod
		}
		if it.Level == LevelShaky && shaky == nil {
			shaky = mod
		}
	}
	return shaky
}
