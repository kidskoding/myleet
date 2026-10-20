package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
)

const starter = "def f():\n    raise NotImplementedError\n"

func setup(t *testing.T) (Workspace, *catalog.Problem) {
	t.Helper()
	pdir := t.TempDir()
	if err := os.WriteFile(filepath.Join(pdir, "starter.py"), []byte(starter), 0o644); err != nil {
		t.Fatal(err)
	}
	return Workspace{Dir: t.TempDir()}, &catalog.Problem{ID: "p", Dir: pdir}
}

func read(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestEnsureCopiesStarterOnce(t *testing.T) {
	w, p := setup(t)
	path, err := w.Ensure(p)
	if err != nil || path != w.AttemptPath("p") || read(t, path) != starter {
		t.Fatalf("Ensure = %q %v", path, err)
	}
	if !strings.HasSuffix(path, filepath.Join("workspace", "p", "attempt.py")) {
		t.Fatalf("path = %s", path)
	}
	os.WriteFile(path, []byte("edited\n"), 0o644)
	if _, err := w.Ensure(p); err != nil || read(t, path) != "edited\n" {
		t.Fatalf("edit lost: %q", read(t, path))
	}
}

func TestEnsureRecreatesDeleted(t *testing.T) {
	w, p := setup(t)
	path, _ := w.Ensure(p)
	os.Remove(path)
	if _, err := w.Ensure(p); err != nil || read(t, path) != starter {
		t.Fatalf("not restored: %v", err)
	}
}

func TestSnapshotDedup(t *testing.T) {
	w, p := setup(t)
	path, _ := w.Ensure(p)
	os.WriteFile(path, []byte("v1\n"), 0o644)
	now := time.Date(2026, 10, 19, 15, 4, 5, 0, time.UTC)
	snap, err := w.Snapshot("p", now)
	if err != nil || filepath.Base(snap) != "20261019T150405Z.py" || read(t, snap) != "v1\n" {
		t.Fatalf("snapshot = %q %v", snap, err)
	}
	if !strings.HasSuffix(filepath.Dir(snap), filepath.Join("snapshots", "p")) {
		t.Fatalf("dir = %s", filepath.Dir(snap))
	}
	again, err := w.Snapshot("p", now.Add(time.Minute))
	if err != nil || again != "" {
		t.Fatalf("identical snapshot = %q %v", again, err)
	}
	os.WriteFile(path, []byte("v2\n"), 0o644)
	w.Snapshot("p", now.Add(2*time.Minute))
	snaps, _ := w.Snapshots("p")
	if len(snaps) != 2 || filepath.Base(snaps[1]) != "20261019T150605Z.py" {
		t.Fatalf("snapshots = %v", snaps)
	}
}

func TestSnapshotsNoneYet(t *testing.T) {
	w, _ := setup(t)
	snaps, err := w.Snapshots("p")
	if err != nil || len(snaps) != 0 {
		t.Fatalf("got %v %v", snaps, err)
	}
}

func TestResetKeepsSnapshots(t *testing.T) {
	w, p := setup(t)
	path, _ := w.Ensure(p)
	os.WriteFile(path, []byte("solved\n"), 0o644)
	w.Snapshot("p", time.Now())
	if err := w.Reset(p); err != nil || read(t, path) != starter {
		t.Fatalf("reset: %v %q", err, read(t, path))
	}
	if snaps, _ := w.Snapshots("p"); len(snaps) != 1 {
		t.Fatalf("snapshots = %v", snaps)
	}
}

func TestDiff(t *testing.T) {
	dir := t.TempDir()
	a, b := filepath.Join(dir, "a.py"), filepath.Join(dir, "b.py")
	os.WriteFile(a, []byte("same\nold line\n"), 0o644)
	os.WriteFile(b, []byte("same\nnew line\n"), 0o644)
	d, err := Diff(a, b)
	if err != nil || !strings.Contains(d, "-old line") || !strings.Contains(d, "+new line") {
		t.Fatalf("diff = %q %v", d, err)
	}
}
