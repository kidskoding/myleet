package progress

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestLogRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sub", "events.jsonl")
	log, events, warns := Open(path)
	if len(events) != 0 || len(warns) != 0 {
		t.Fatalf("fresh log: %v %v", events, warns)
	}
	base := time.Date(2026, 10, 19, 15, 0, 0, 0, time.UTC)
	want := []Event{
		{Time: base, Kind: Opened, Problem: "two-sum", Attempt: "a1", Mode: Practice},
		{Time: base.Add(time.Minute), Kind: TestRun, Problem: "two-sum", Attempt: "a1", Mode: Practice, Data: map[string]string{"passed": "1", "total": "2"}},
		{Time: base.Add(2 * time.Minute), Kind: Passed, Problem: "two-sum", Attempt: "a1", Mode: Practice, Data: map[string]string{"elapsed_ms": "120000"}},
	}
	for _, e := range want {
		if err := log.Append(e); err != nil {
			t.Fatal(err)
		}
	}
	_, got, warns := Open(path)
	if len(warns) != 0 {
		t.Fatalf("warnings: %v", warns)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v\nwant %+v", got, want)
	}
}

func TestLogCorruptLine(t *testing.T) {
	path := filepath.Join(t.TempDir(), "events.jsonl")
	content := `{"t":"2026-10-19T15:00:00Z","kind":"opened","problem":"a","attempt":"x","mode":"practice"}
not json at all
{"t":"2026-10-19T15:01:00Z","kind":"left","problem":"a","attempt":"x","mode":"practice"}
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	_, events, warns := Open(path)
	if len(events) != 2 || len(warns) != 1 {
		t.Fatalf("events=%d warns=%v", len(events), warns)
	}
}

func TestNewAttemptID(t *testing.T) {
	a, b := NewAttemptID(), NewAttemptID()
	if len(a) != 12 || a == b {
		t.Fatalf("ids %q %q", a, b)
	}
}
