package app

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

type env struct {
	root, state string
}

func newEnv(t *testing.T) env {
	t.Helper()
	root := t.TempDir()
	if err := os.CopyFS(root, os.DirFS(tu.GoodRoot())); err != nil {
		t.Fatal(err)
	}
	data := t.TempDir()
	t.Setenv("MYLEET_ROOT", root)
	t.Setenv("XDG_DATA_HOME", data)
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	return env{root: root, state: filepath.Join(data, "myleet")}
}

func (e env) load(t *testing.T) *App {
	t.Helper()
	a, err := Load(os.Stderr)
	if err != nil {
		t.Fatal(err)
	}
	return a
}

func (e env) save() string { return filepath.Join(e.state, "progress.toml") }

func pass(a *App, id string, at time.Time) {
	att := progress.NewAttemptID()
	a.Record(progress.Event{Time: at, Kind: progress.Opened, Problem: id, Attempt: att, Mode: progress.Practice})
	a.Record(progress.Event{Time: at.Add(time.Minute), Kind: progress.Passed, Problem: id, Attempt: att, Mode: progress.Practice, Data: map[string]string{"elapsed_ms": "60000"}})
}

func TestSaveFileIsSourceOfTruth(t *testing.T) {
	e := newEnv(t)
	os.MkdirAll(e.state, 0o755)
	os.WriteFile(e.save(), []byte("[p-one]\nrung = \"14d\"\ndue = 2026-11-01\nlast = 2026-10-18\n"), 0o644)
	a := e.load(t)
	if st := a.States()["p-one"]; st.Status != schedule.Mastered || st.Rung != 3 {
		t.Fatalf("p-one = %+v", st)
	}
}

func TestRecordAppliesAttemptToSaveFile(t *testing.T) {
	e := newEnv(t)
	a := e.load(t)
	pass(a, "p-one", time.Now())
	data, _ := os.ReadFile(e.save())
	if !strings.Contains(string(data), "[p-one]\nrung = \"1d\"") {
		t.Fatalf("save file:\n%s", data)
	}
	if _, err := os.Stat(filepath.Join(e.state, "events.jsonl")); err != nil {
		t.Fatal("history log should sit next to the save file")
	}
}

func TestHandEditSurvivesRecord(t *testing.T) {
	e := newEnv(t)
	a := e.load(t)
	pass(a, "p-one", time.Now().Add(-time.Hour))
	os.WriteFile(e.save(), []byte("# I removed p-one by hand\n"), 0o644)
	pass(a, "p-two", time.Now())
	data, _ := os.ReadFile(e.save())
	if strings.Contains(string(data), "[p-one]") || !strings.Contains(string(data), "[p-two]") {
		t.Fatalf("a hand edit must survive the next action:\n%s", data)
	}
}

func TestBrokenSaveFileStopsLoad(t *testing.T) {
	e := newEnv(t)
	os.MkdirAll(e.state, 0o755)
	os.WriteFile(e.save(), []byte("[p-one]\nrung = \"1d\"\nlast = nope\n"), 0o644)
	if _, err := Load(os.Stderr); err == nil || !strings.Contains(err.Error(), "line 3") || !strings.Contains(err.Error(), "myleet progress") {
		t.Fatalf("err = %v", err)
	}
}

func TestBuildsSaveFileFromHistory(t *testing.T) {
	e := newEnv(t)
	os.MkdirAll(e.state, 0o755)
	log := `{"t":"2026-10-19T15:00:00Z","kind":"opened","problem":"p-one","attempt":"a1","mode":"practice"}
{"t":"2026-10-19T15:05:00Z","kind":"passed","problem":"p-one","attempt":"a1","mode":"practice","data":{"elapsed_ms":"300000"}}
`
	os.WriteFile(filepath.Join(e.state, "events.jsonl"), []byte(log), 0o644)
	e.load(t)
	if data, _ := os.ReadFile(e.save()); !strings.Contains(string(data), "[p-one]") {
		t.Fatalf("save file should be built from history:\n%s", data)
	}
}

func TestMovesProgressOutOfTheRepo(t *testing.T) {
	e := newEnv(t)
	repoState := filepath.Join(e.root, ".myleet")
	os.MkdirAll(repoState, 0o755)
	os.WriteFile(filepath.Join(repoState, "events.jsonl"), []byte(`{"t":"2026-10-19T15:00:00Z","kind":"opened","problem":"p-one","attempt":"a1","mode":"practice"}`+"\n"), 0o644)
	os.WriteFile(filepath.Join(repoState, "progress.toml"), []byte("# generated\n"), 0o644)
	a := e.load(t)
	if len(a.Events) != 1 {
		t.Fatalf("events not moved: %d", len(a.Events))
	}
	if _, err := os.Stat(repoState); !os.IsNotExist(err) {
		t.Fatal("the repo .myleet folder should be gone after moving")
	}
}

func TestStateDirFromConfig(t *testing.T) {
	e := newEnv(t)
	custom := t.TempDir()
	cfgDir := filepath.Join(os.Getenv("XDG_CONFIG_HOME"), "myleet")
	os.MkdirAll(cfgDir, 0o755)
	os.WriteFile(filepath.Join(cfgDir, "config.toml"), []byte("state_dir = \""+custom+"\"\n"), 0o644)
	a := e.load(t)
	pass(a, "p-one", time.Now())
	if _, err := os.Stat(filepath.Join(custom, "progress.toml")); err != nil {
		t.Fatal("save file should follow state_dir")
	}
}
