package savestate

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func sample() map[string]schedule.State {
	return map[string]schedule.State{
		"p-two": {Status: schedule.Learning, Rung: 1, Due: tu.Midnight(23), LastFinished: tu.Midnight(20),
			FirstFinished: tu.Midnight(19), Attempts: 2, CleanPasses: 1, BestElapsed: 4*time.Minute + 12*time.Second},
		"two-sum": {Status: schedule.Mastered, Rung: 3, Due: tu.Midnight(30), LastFinished: tu.Midnight(16),
			FirstFinished: tu.Midnight(1), Attempts: 4, CleanPasses: 4, BestElapsed: time.Minute},
		"p-one": {Status: schedule.Unseen, Rung: -1},
	}
}

func TestWriteIsEditableAndOrdered(t *testing.T) {
	path := filepath.Join(t.TempDir(), "progress.toml")
	if err := Write(path, tu.GoodCatalog(t), sample(), tu.Chicago); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(path)
	text := string(data)
	if !strings.Contains(text, "You can edit this file") || strings.Contains(text, "DO NOT EDIT") {
		t.Fatalf("header should invite editing:\n%s", text)
	}
	if strings.Contains(text, "[p-one]") {
		t.Fatal("unseen problems are left out")
	}
	if strings.Index(text, "[p-two]") > strings.Index(text, "[two-sum]") {
		t.Fatalf("curriculum order expected:\n%s", text)
	}
	if !strings.Contains(text, "rung = \"3d\"\ndue = 2026-10-23\n") {
		t.Fatalf("p-two block:\n%s", text)
	}
}

func TestRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "progress.toml")
	want := sample()
	if err := Write(path, tu.GoodCatalog(t), want, tu.Chicago); err != nil {
		t.Fatal(err)
	}
	got, err := Read(path, tu.Chicago)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d entries", len(got))
	}
	for id, w := range want {
		if w.Rung < 0 {
			continue
		}
		g := got[id]
		if g.Rung != w.Rung || g.Status != w.Status || !g.Due.Equal(w.Due) || !g.LastFinished.Equal(w.LastFinished) ||
			!g.FirstFinished.Equal(w.FirstFinished) || g.Attempts != w.Attempts || g.CleanPasses != w.CleanPasses || g.BestElapsed != w.BestElapsed {
			t.Errorf("%s: got %+v want %+v", id, g, w)
		}
	}
}

func TestReadMissingFile(t *testing.T) {
	got, err := Read(filepath.Join(t.TempDir(), "nope.toml"), tu.Chicago)
	if err == nil || !os.IsNotExist(err) || got != nil {
		t.Fatalf("got %v, %v", got, err)
	}
}

func TestReadRejectsBadRung(t *testing.T) {
	path := filepath.Join(t.TempDir(), "progress.toml")
	os.WriteFile(path, []byte("[two-sum]\nrung = \"5d\"\ndue = 2026-10-23\nlast = 2026-10-20\n"), 0o644)
	if _, err := Read(path, tu.Chicago); err == nil || !strings.Contains(err.Error(), "two-sum") || !strings.Contains(err.Error(), "5d") {
		t.Fatalf("err = %v", err)
	}
}

func TestReadSyntaxErrorHasLine(t *testing.T) {
	path := filepath.Join(t.TempDir(), "progress.toml")
	os.WriteFile(path, []byte("[two-sum]\nrung = \"1d\"\ndue = oops\n"), 0o644)
	if _, err := Read(path, tu.Chicago); err == nil || !strings.Contains(err.Error(), "line 3") {
		t.Fatalf("err = %v", err)
	}
}

func TestWriteKeepsUnknownIDs(t *testing.T) {
	path := filepath.Join(t.TempDir(), "progress.toml")
	states := sample()
	states["removed-problem"] = schedule.State{Status: schedule.Learning, Rung: 0, Due: tu.Midnight(21), LastFinished: tu.Midnight(20)}
	Write(path, tu.GoodCatalog(t), states, tu.Chicago)
	got, _ := Read(path, tu.Chicago)
	if _, ok := got["removed-problem"]; !ok {
		t.Fatal("entries for problems not in the curriculum must not be dropped")
	}
}
