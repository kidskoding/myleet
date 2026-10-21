package schedule

import (
	"slices"
	"strconv"
	"time"

	"github.com/kidskoding/myleet/internal/progress"
)

var Rungs = []int{1, 3, 7, 14, 30}

type Status string

const (
	Unseen    Status = "unseen"
	Learning  Status = "learning"
	Reviewing Status = "reviewing"
	Mastered  Status = "mastered"
)

type State struct {
	Status                                     Status
	Rung                                       int
	LastFinished, FirstFinished                time.Time
	Due                                        time.Time
	Attempts, CleanPasses, Fails, HintAttempts int
	BestElapsed                                time.Duration
}

type Outcome int

const (
	OutcomeNone Outcome = iota
	OutcomePass
	OutcomeFail
)

type Attempt struct {
	ID, Problem  string
	Start, End   time.Time
	Outcome      Outcome
	Clean        bool
	Elapsed      time.Duration
	Hints, Peeks int
	Mode         progress.Mode
}

func ms(data map[string]string, key string) time.Duration {
	v, err := strconv.ParseInt(data[key], 10, 64)
	if err != nil {
		return 0
	}
	return time.Duration(v) * time.Millisecond
}

func Attempts(events []progress.Event, target func(id string) time.Duration) []Attempt {
	index := map[string]int{}
	var out []Attempt
	type extra struct {
		runs             int
		passedAt, endAt  time.Time
		passed, gaveUp   bool
		left             bool
		elapsed, penalty time.Duration
		hasElapsed       bool
	}
	extras := []*extra{}
	for _, e := range events {
		if e.Mode == progress.Placement || e.Mode == progress.Checkpoint ||
			e.Kind == progress.PlacementDone || e.Kind == progress.CheckpointDone {
			continue // diagnostic / checkpoint attempts do not move the review ladder
		}
		i, ok := index[e.Attempt]
		if !ok {
			i = len(out)
			index[e.Attempt] = i
			out = append(out, Attempt{ID: e.Attempt, Problem: e.Problem, Start: e.Time, Mode: e.Mode})
			extras = append(extras, &extra{})
		}
		a, x := &out[i], extras[i]
		switch e.Kind {
		case progress.TestRun:
			x.runs++
		case progress.HintRevealed:
			if !x.passed { // looking at hints after passing does not undo the pass
				a.Hints++
			}
		case progress.SolutionPeeked:
			if !x.passed {
				a.Peeks++
			}
		case progress.Passed:
			if !x.passed {
				x.passed, x.passedAt = true, e.Time
				if _, has := e.Data["elapsed_ms"]; has {
					x.elapsed, x.hasElapsed = ms(e.Data, "elapsed_ms"), true
				}
			}
		case progress.GaveUp:
			if !x.gaveUp {
				x.gaveUp, x.endAt = true, e.Time
			}
		case progress.Left:
			if !x.left {
				x.left = true
				if x.endAt.IsZero() {
					x.endAt = e.Time
				}
			}
		}
	}
	for i := range out {
		a, x := &out[i], extras[i]
		switch {
		case x.passed:
			a.Outcome, a.End = OutcomePass, x.passedAt
			a.Elapsed = x.elapsed
			if !x.hasElapsed {
				a.Elapsed = x.passedAt.Sub(a.Start)
			}
			a.Clean = a.Hints == 0 && a.Peeks == 0 && a.Elapsed < target(a.Problem)
		case x.gaveUp, x.left && x.runs > 0:
			a.Outcome, a.End = OutcomeFail, x.endAt
		}
	}
	return out
}

func localDay(t time.Time, loc *time.Location) time.Time {
	y, m, d := t.In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

// StatusFor maps a ladder rung to its status; -1 means never finished.
func StatusFor(rung int) Status {
	switch {
	case rung < 0:
		return Unseen
	case rung <= 1:
		return Learning
	case rung == 2:
		return Reviewing
	default:
		return Mastered
	}
}

func Compute(events []progress.Event, target func(id string) time.Duration, loc *time.Location) map[string]State {
	attempts := Attempts(events, target)
	finished := slices.DeleteFunc(slices.Clone(attempts), func(a Attempt) bool { return a.Outcome == OutcomeNone })
	slices.SortStableFunc(finished, func(a, b Attempt) int { return a.End.Compare(b.End) })

	states := map[string]State{}
	for _, a := range attempts {
		if _, ok := states[a.Problem]; !ok {
			states[a.Problem] = State{Status: Unseen, Rung: -1}
		}
	}
	for _, a := range finished {
		states[a.Problem] = Apply(states[a.Problem], a, loc)
	}
	return states
}

// Apply: first finish lands on 1d, a clean pass on a later day climbs one rung,
// a clean pass on the same day changes nothing, anything else drops to 1d.
func Apply(st State, a Attempt, loc *time.Location) State {
	switch {
	case st.Rung < 0:
		st.Rung, st.FirstFinished = 0, a.End
	case a.Clean && localDay(a.End, loc).After(localDay(st.LastFinished, loc)):
		st.Rung = min(st.Rung+1, len(Rungs)-1)
	case a.Clean:
	default:
		st.Rung = 0
	}
	st.LastFinished = a.End
	st.Attempts++
	if a.Outcome == OutcomeFail {
		st.Fails++
	}
	if a.Hints > 0 {
		st.HintAttempts++
	}
	if a.Clean {
		st.CleanPasses++
	}
	if a.Outcome == OutcomePass && (st.BestElapsed == 0 || a.Elapsed < st.BestElapsed) {
		st.BestElapsed = a.Elapsed
	}
	st.Status = StatusFor(st.Rung)
	st.Due = localDay(a.End, loc).AddDate(0, 0, Rungs[st.Rung])
	return st
}
