// Package checkpoint is the curriculum-slice exam that realigns Today afterward.
package checkpoint

import (
	"strconv"
	"strings"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
)

const (
	mixedModule = "mixed_interview_practice"
	// checkInEvery is how many practice passes between recommended check-ins.
	// Mid-module or across modules, whenever you've done this much work.
	checkInEvery = 3
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

type ItemResult struct {
	Topic     string
	ProblemID string
	ModuleID  string
	Outcome   Outcome
	Level     Level
}

type Result struct {
	Through int // module number ceiling
	Items   []ItemResult
}

func Score(passed bool, hints int, skipped bool) Outcome {
	switch {
	case skipped:
		return OutcomeSkipped
	case !passed:
		return OutcomeFailed
	case hints > 0:
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

// CeilingModules are non-bank curriculum modules that can be a checkpoint "through" point.
func CeilingModules(c *catalog.Catalog) []*catalog.Module {
	var out []*catalog.Module
	for _, m := range c.Modules {
		if m.Bank || m.ID == mixedModule {
			continue
		}
		out = append(out, m)
	}
	return out
}

// DefaultThrough is the furthest module with a practice pass, else the first ceiling module's number.
func DefaultThrough(c *catalog.Catalog, attempts []schedule.Attempt) int {
	ceilings := CeilingModules(c)
	if len(ceilings) == 0 {
		return 0
	}
	passed := map[string]bool{}
	for _, a := range attempts {
		if a.Outcome == schedule.OutcomePass && a.Mode == progress.Practice {
			passed[a.Problem] = true
		}
	}
	furthest := ceilings[0].Number
	for _, m := range ceilings {
		for _, t := range m.Techniques {
			for _, p := range t.Problems {
				if passed[p.ID] && m.Number > furthest {
					furthest = m.Number
				}
			}
		}
	}
	return furthest
}

// Load reconstructs the latest checkpoint result from events.
func Load(events []progress.Event) (Result, bool) {
	for i := len(events) - 1; i >= 0; i-- {
		e := events[i]
		if e.Kind != progress.CheckpointDone {
			continue
		}
		through, _ := strconv.Atoi(e.Data["through"])
		raw := e.Data["results"]
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
		return Result{Through: through, Items: items}, true
	}
	return Result{}, false
}

// Encode packs results for a CheckpointDone event.
func Encode(through int, items []ItemResult) map[string]string {
	parts := make([]string, 0, len(items))
	for _, it := range items {
		topic := strings.ReplaceAll(it.Topic, ":", " ")
		parts = append(parts, strings.Join([]string{topic, it.ProblemID, string(it.Outcome), it.ModuleID}, ":"))
	}
	return map[string]string{
		"through": strconv.Itoa(through),
		"results": strings.Join(parts, ","),
	}
}

// WeakModules are module ids the learner should drill first after a checkpoint.
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

// SuggestThrough picks a check-in ceiling when you've done enough practice since
// the last checkpoint (or snooze). The ceiling is your current frontier: mid-module
// is fine; spanning several modules is fine. Not an end-of-chapter gate.
func SuggestThrough(c *catalog.Catalog, events []progress.Event, attempts []schedule.Attempt, now time.Time) int {
	_ = now
	since := lastCheckpointAt(events)
	if passesSince(attempts, since) < checkInEvery {
		return 0
	}
	return DefaultThrough(c, attempts)
}

func lastCheckpointAt(events []progress.Event) time.Time {
	var latest time.Time
	for _, e := range events {
		if e.Kind != progress.CheckpointDone {
			continue
		}
		if e.Time.After(latest) {
			latest = e.Time
		}
	}
	return latest
}

func passesSince(attempts []schedule.Attempt, since time.Time) int {
	n := 0
	for _, a := range attempts {
		if a.Outcome != schedule.OutcomePass || a.Mode != progress.Practice {
			continue
		}
		at := a.End
		if at.IsZero() {
			at = a.Start
		}
		if since.IsZero() || at.After(since) {
			n++
		}
	}
	return n
}

// Snooze packs a "not now" so Today stops recommending this ceiling for a while.
func Snooze(through int) map[string]string {
	return map[string]string{"through": strconv.Itoa(through), "snoozed": "1"}
}

// ModuleTitle returns the title of the ceiling module with the given number.
func ModuleTitle(c *catalog.Catalog, through int) string {
	for _, m := range CeilingModules(c) {
		if m.Number == through {
			return m.Title
		}
	}
	return ""
}
