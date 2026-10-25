// Package progress is the append-only history of every learner action; stats are
// computed from it, scheduling lives in the save file.
package progress

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

type Kind string

const (
	Opened          Kind = "opened"
	HintRevealed    Kind = "hint_revealed"
	SolutionPeeked  Kind = "solution_peeked"
	TestRun         Kind = "test_run"
	Passed          Kind = "passed"
	GaveUp          Kind = "gave_up"
	Left            Kind = "left"
	Reset           Kind = "reset"
	SayAloudChecked Kind = "say_aloud_checked"
	TimerRestarted Kind = "timer_restarted"
	// PlacementDone marks that the new-user diagnostic finished or was skipped.
	PlacementDone Kind = "placement_done"
	// CheckpointDone marks that a curriculum-slice checkpoint exam finished.
	CheckpointDone Kind = "checkpoint_done"
)

type Mode string

const (
	Practice   Mode = "practice"
	Interview  Mode = "interview"
	Placement  Mode = "placement"
	Checkpoint Mode = "checkpoint"
	// Drill is a keep-sharp attempt: it counts for streak/stats freshness but
	// does not climb or drop the spaced-repetition ladder.
	Drill Mode = "drill"
)

// Event Data keys: test_run passed,total; passed elapsed_ms; say_aloud_checked item;
// hint_revealed penalty_ms (interview mode).
type Event struct {
	Time    time.Time         `json:"t"`
	Kind    Kind              `json:"kind"`
	Problem string            `json:"problem"`
	Attempt string            `json:"attempt"`
	Mode    Mode              `json:"mode"`
	Data    map[string]string `json:"data,omitempty"`
}

func NewAttemptID() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
