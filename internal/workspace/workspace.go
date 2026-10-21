package workspace

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
)

const stampFormat = "20060102T150405Z"

type Workspace struct{ Dir string }

func (w Workspace) AttemptPath(id string) string {
	return filepath.Join(w.Dir, "workspace", id, "attempt.py")
}

func (w Workspace) snapshotDir(id string) string {
	return filepath.Join(w.Dir, "snapshots", id)
}

func (w Workspace) Ensure(p *catalog.Problem) (string, error) {
	path := w.AttemptPath(p.ID)
	if _, err := os.Stat(path); err == nil {
		return path, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", err
	}
	return path, w.copyStarter(p, path)
}

func (w Workspace) copyStarter(p *catalog.Problem, path string) error {
	data, err := os.ReadFile(p.StarterPath())
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// Snapshot returns "" when the attempt matches the latest snapshot.
func (w Workspace) Snapshot(id string, now time.Time) (string, error) {
	data, err := os.ReadFile(w.AttemptPath(id))
	if err != nil {
		return "", err
	}
	snaps, err := w.Snapshots(id)
	if err != nil {
		return "", err
	}
	if len(snaps) > 0 {
		if latest, err := os.ReadFile(snaps[len(snaps)-1]); err == nil && bytes.Equal(latest, data) {
			return "", nil
		}
	}
	dir := w.snapshotDir(id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, now.UTC().Format(stampFormat)+".py")
	return path, os.WriteFile(path, data, 0o644)
}

func (w Workspace) Snapshots(id string) ([]string, error) {
	paths, err := filepath.Glob(filepath.Join(w.snapshotDir(id), "*.py"))
	slices.Sort(paths)
	return paths, err
}

func (w Workspace) Reset(p *catalog.Problem) error {
	return w.copyStarter(p, w.AttemptPath(p.ID))
}

// ClearAttempts removes all attempt files and snapshots (keeps prompts cache elsewhere).
func (w Workspace) ClearAttempts() error {
	for _, name := range []string{"workspace", "snapshots"} {
		path := filepath.Join(w.Dir, name)
		if err := os.RemoveAll(path); err != nil {
			return err
		}
	}
	return nil
}
