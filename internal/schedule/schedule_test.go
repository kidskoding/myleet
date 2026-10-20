package schedule

import (
	"strconv"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/progress"
)

var chicago, _ = time.LoadLocation("America/Chicago")

func target(string) time.Duration { return 30 * time.Minute }

// at returns local Chicago time on 2026-10-<day> at hh:mm, in UTC.
func at(day, hh, mm int) time.Time {
	return time.Date(2026, 10, day, hh, mm, 0, 0, chicago).UTC()
}

type step struct {
	kind progress.Kind
	off  time.Duration
	data map[string]string
}

var n int

func attempt(start time.Time, steps ...step) []progress.Event {
	n++
	id := "att" + strconv.Itoa(n)
	evs := []progress.Event{{Time: start, Kind: progress.Opened, Problem: "p", Attempt: id, Mode: progress.Practice}}
	for _, s := range steps {
		evs = append(evs, progress.Event{Time: start.Add(s.off), Kind: s.kind, Problem: "p", Attempt: id, Mode: progress.Practice, Data: s.data})
	}
	return evs
}

func run(off time.Duration) step {
	return step{progress.TestRun, off, map[string]string{"passed": "1", "total": "1"}}
}
func pass(off time.Duration) step {
	return step{progress.Passed, off, map[string]string{"elapsed_ms": strconv.FormatInt(off.Milliseconds(), 10)}}
}
func hint(off time.Duration) step { return step{progress.HintRevealed, off, nil} }
func cleanPass(start time.Time) []progress.Event {
	return attempt(start, run(5*time.Minute), pass(10*time.Minute))
}

func concat(groups ...[]progress.Event) []progress.Event {
	var out []progress.Event
	for _, g := range groups {
		out = append(out, g...)
	}
	return out
}

func localMidnight(day int) time.Time { return time.Date(2026, 10, day, 0, 0, 0, 0, chicago) }

func TestScheduleTable(t *testing.T) {
	cases := []struct {
		name   string
		events []progress.Event
		status Status
		rung   int
		dueDay int // 0 = zero Due
	}{
		{"first pass", cleanPass(at(1, 10, 0)), Learning, 0, 2},
		{"climb to mastered", concat(cleanPass(at(1, 10, 0)), cleanPass(at(2, 10, 0)), cleanPass(at(5, 10, 0)), cleanPass(at(12, 10, 0))), Mastered, 3, 26},
		{"same-day second pass", concat(cleanPass(at(1, 10, 0)), cleanPass(at(1, 18, 0))), Learning, 0, 2},
		{"hint pass drops", concat(cleanPass(at(1, 10, 0)), cleanPass(at(2, 10, 0)), cleanPass(at(5, 10, 0)), cleanPass(at(12, 10, 0)),
			attempt(at(26, 10, 0), hint(time.Minute), pass(5*time.Minute))), Learning, 0, 27},
		{"over target drops", concat(cleanPass(at(1, 10, 0)), attempt(at(2, 10, 0), pass(40*time.Minute))), Learning, 0, 3},
		{"gave up drops", concat(cleanPass(at(1, 10, 0)), cleanPass(at(2, 10, 0)), attempt(at(5, 10, 0), step{progress.GaveUp, time.Minute, nil})), Learning, 0, 6},
		{"left after run is fail", concat(cleanPass(at(1, 10, 0)), cleanPass(at(2, 10, 0)), attempt(at(5, 10, 0), run(time.Minute), step{progress.Left, 2 * time.Minute, nil})), Learning, 0, 6},
		{"left without run is nothing", attempt(at(1, 10, 0), step{progress.Left, time.Minute, nil}), Unseen, -1, 0},
		{"first finished is a fail", attempt(at(1, 10, 0), step{progress.GaveUp, time.Minute, nil}), Learning, 0, 2},
		{"reviewing at rung 2", concat(cleanPass(at(1, 10, 0)), cleanPass(at(2, 10, 0)), cleanPass(at(5, 10, 0))), Reviewing, 2, 12},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			st := Compute(c.events, target, chicago)["p"]
			if st.Status != c.status || st.Rung != c.rung {
				t.Fatalf("status=%s rung=%d, want %s %d", st.Status, st.Rung, c.status, c.rung)
			}
			if c.dueDay == 0 {
				if !st.Due.IsZero() {
					t.Fatalf("due = %v, want zero", st.Due)
				}
			} else if !st.Due.Equal(localMidnight(c.dueDay)) {
				t.Fatalf("due = %v, want %v", st.Due, localMidnight(c.dueDay))
			}
		})
	}
}

func TestDayRolloverUsesEventTime(t *testing.T) {
	events := concat(
		attempt(at(1, 23, 40), pass(10*time.Minute)), // passes 23:50 day 1
		attempt(at(2, 0, 5), pass(5*time.Minute)),    // passes 00:10 day 2
	)
	st := Compute(events, target, chicago)["p"]
	if st.Rung != 1 {
		t.Fatalf("rung = %d, want 1", st.Rung)
	}
}

func TestAttemptsCountsAndClean(t *testing.T) {
	events := concat(cleanPass(at(1, 10, 0)), attempt(at(2, 10, 0), hint(time.Minute), step{progress.SolutionPeeked, 2 * time.Minute, nil}, pass(5*time.Minute)))
	atts := Attempts(events, target)
	if len(atts) != 2 {
		t.Fatalf("attempts = %d", len(atts))
	}
	if !atts[0].Clean || atts[0].Elapsed != 10*time.Minute || atts[0].Outcome != OutcomePass {
		t.Fatalf("att0 = %+v", atts[0])
	}
	if atts[1].Clean || atts[1].Hints != 1 || atts[1].Peeks != 1 {
		t.Fatalf("att1 = %+v", atts[1])
	}
	st := Compute(events, target, chicago)["p"]
	if st.Attempts != 2 || st.CleanPasses != 1 || st.HintAttempts != 1 || st.BestElapsed != 5*time.Minute {
		t.Fatalf("state = %+v", st)
	}
}

func TestInterviewPenaltyCountsTowardTime(t *testing.T) {
	// elapsed_ms already includes the 3m penalty the TUI added to the clock.
	events := attempt(at(1, 10, 0), step{progress.HintRevealed, time.Minute, map[string]string{"penalty_ms": "180000"}}, pass(31*time.Minute))
	atts := Attempts(events, target)
	if atts[0].Elapsed != 31*time.Minute || atts[0].Clean {
		t.Fatalf("att = %+v", atts[0])
	}
}

func TestHintAfterPassKeepsPassClean(t *testing.T) {
	events := attempt(at(1, 10, 0), pass(5*time.Minute), hint(6*time.Minute), step{progress.SolutionPeeked, 7 * time.Minute, nil})
	atts := Attempts(events, target)
	if !atts[0].Clean || atts[0].Hints != 0 || atts[0].Peeks != 0 {
		t.Fatalf("hints and peeks after passing must not count: %+v", atts[0])
	}
}

func TestApplyOneAttempt(t *testing.T) {
	st := State{Status: Learning, Rung: 1, LastFinished: at(2, 10, 0)}
	a := Attempt{Problem: "p", Outcome: OutcomePass, Clean: true, End: at(5, 10, 0), Elapsed: 4 * time.Minute}
	next := Apply(st, a, chicago)
	if next.Rung != 2 || next.Status != Reviewing || !next.Due.Equal(localMidnight(12)) || next.BestElapsed != 4*time.Minute {
		t.Fatalf("next = %+v", next)
	}
	if fresh := Apply(State{Status: Unseen, Rung: -1}, a, chicago); fresh.Rung != 0 || fresh.FirstFinished != a.End {
		t.Fatalf("first attempt = %+v", fresh)
	}
}

func TestStatusForRung(t *testing.T) {
	for rung, want := range map[int]Status{-1: Unseen, 0: Learning, 1: Learning, 2: Reviewing, 3: Mastered, 4: Mastered} {
		if got := StatusFor(rung); got != want {
			t.Errorf("StatusFor(%d) = %s, want %s", rung, got, want)
		}
	}
}
