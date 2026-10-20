package app

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/config"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
	"github.com/kidskoding/myleet/internal/savestate"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/workspace"
)

const (
	SaveFile    = "progress.toml"
	HistoryFile = "events.jsonl"
	legacyRepo  = ".myleet" // progress briefly lived in the repo; moved out on load
)

type App struct {
	Root      string
	Catalog   *catalog.Catalog
	Config    config.Config
	Log       *progress.Log
	Events    []progress.Event
	Workspace workspace.Workspace
	Runner    runner.Runner
	Prompts   prompt.Source
	PythonErr error
	StatePath string // the save file; empty keeps state in memory only (tests)
	Now       func() time.Time
	Loc       *time.Location

	states  map[string]schedule.State
	applied map[string]bool // attempt ids already applied to the save state
}

// Load refuses a broken save file so a hand edit is never overwritten.
func Load(warn io.Writer) (*App, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	root, err := catalog.FindRoot(cwd)
	if err != nil {
		return nil, err
	}
	cat, err := catalog.Load(root)
	if err != nil {
		return nil, fmt.Errorf("curriculum has problems:\n%w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("config %s: %w", config.Path(), err)
	}
	data, stateDir := config.DataDir(), cfg.StateDirPath()
	if err := moveOutOfRepo(filepath.Join(root, legacyRepo), stateDir); err != nil {
		fmt.Fprintln(warn, "warning: could not move progress out of the repo:", err)
	}
	log, events, warns := progress.Open(filepath.Join(stateDir, HistoryFile))
	for _, w := range warns {
		fmt.Fprintln(warn, "warning:", w)
	}
	py, pyErr := runner.ResolvePython(cfg, root)
	a := &App{
		Root: root, Catalog: cat, Config: cfg, Log: log, Events: events,
		Workspace: workspace.Workspace{Dir: data},
		Prompts:   prompt.Source{Dir: filepath.Join(data, "prompts"), Endpoint: os.Getenv("MYLEET_LEETCODE_ENDPOINT")},
		Runner:    runner.Runner{Python: py, Timeout: cfg.Timeout, LibDir: cat.LibDir()},
		PythonErr: pyErr, Now: time.Now, Loc: time.Local,
		StatePath: filepath.Join(stateDir, SaveFile),
	}
	states, err := savestate.Read(a.StatePath, a.Loc)
	switch {
	case errors.Is(err, os.ErrNotExist):
		a.states = schedule.Compute(events, a.Target, a.Loc)
		if err := savestate.Write(a.StatePath, cat, a.states, a.Loc); err != nil {
			fmt.Fprintln(warn, "warning: could not write", a.StatePath+":", err)
		}
	case err != nil:
		return nil, fmt.Errorf("your save file has a problem (fix it with `myleet progress`):\n%w", err)
	default:
		a.states = states
	}
	a.markApplied()
	return a, nil
}

func (a *App) Target(id string) time.Duration {
	if p, ok := a.Catalog.Problem(id); ok {
		return p.TimeTarget
	}
	return catalog.DefaultTimeTargets[catalog.Medium]
}

func (a *App) States() map[string]schedule.State {
	if a.states == nil {
		a.states = schedule.Compute(a.Events, a.Target, a.Loc)
		a.markApplied()
	}
	return a.states
}

func (a *App) markApplied() {
	a.applied = map[string]bool{}
	for _, at := range schedule.Attempts(a.Events, a.Target) {
		if at.Outcome != schedule.OutcomeNone {
			a.applied[at.ID] = true
		}
	}
}

func (a *App) Attempts() []schedule.Attempt {
	return schedule.Attempts(a.Events, a.Target)
}

// Record re-reads the save file before applying an attempt, so edits made by hand
// while myleet runs are kept.
func (a *App) Record(e progress.Event) error {
	a.States()
	if err := a.Log.Append(e); err != nil {
		return err
	}
	a.Events = append(a.Events, e)
	if a.applied[e.Attempt] {
		return nil
	}
	var mine []progress.Event
	for _, ev := range a.Events {
		if ev.Attempt == e.Attempt {
			mine = append(mine, ev)
		}
	}
	atts := schedule.Attempts(mine, a.Target)
	if len(atts) == 0 || atts[0].Outcome == schedule.OutcomeNone {
		return nil
	}
	a.applied[e.Attempt] = true
	if a.StatePath != "" {
		onDisk, err := savestate.Read(a.StatePath, a.Loc)
		switch {
		case err == nil:
			a.states = onDisk
		case !errors.Is(err, os.ErrNotExist):
			return fmt.Errorf("not saving: your save file has a problem (fix it with `myleet progress`): %w", err)
		}
	}
	st, ok := a.states[e.Problem]
	if !ok {
		st = schedule.State{Status: schedule.Unseen, Rung: -1}
	}
	a.states[e.Problem] = schedule.Apply(st, atts[0], a.Loc)
	if a.StatePath == "" {
		return nil
	}
	return savestate.Write(a.StatePath, a.Catalog, a.states, a.Loc)
}

// moveOutOfRepo migrates progress from <repo>/.myleet, where it briefly lived.
func moveOutOfRepo(repoState, stateDir string) error {
	legacyLog := filepath.Join(repoState, HistoryFile)
	data, err := os.ReadFile(legacyLog)
	if err != nil {
		return nil
	}
	current := filepath.Join(stateDir, HistoryFile)
	if _, err := os.Stat(current); errors.Is(err, os.ErrNotExist) {
		if err := os.MkdirAll(stateDir, 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(current, data, 0o644); err != nil {
			return err
		}
	}
	if err := os.Remove(legacyLog); err != nil {
		return err
	}
	_ = os.Remove(filepath.Join(repoState, SaveFile))
	return os.Remove(repoState)
}
