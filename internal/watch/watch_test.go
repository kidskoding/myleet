package watch

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func start(t *testing.T) (string, <-chan struct{}) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "attempt.py")
	if err := os.WriteFile(path, []byte("v0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	ch, err := File(ctx, path, 150*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	return path, ch
}

func count(ch <-chan struct{}, within time.Duration) int {
	n := 0
	deadline := time.After(within)
	for {
		select {
		case <-ch:
			n++
		case <-deadline:
			return n
		}
	}
}

func TestWatchWrite(t *testing.T) {
	path, ch := start(t)
	os.WriteFile(path, []byte("v1\n"), 0o644)
	if n := count(ch, time.Second); n != 1 {
		t.Fatalf("signals = %d, want 1", n)
	}
}

func TestWatchBurstCoalesced(t *testing.T) {
	path, ch := start(t)
	for i := 0; i < 5; i++ {
		os.WriteFile(path, []byte{byte('a' + i), '\n'}, 0o644)
		time.Sleep(10 * time.Millisecond)
	}
	if n := count(ch, time.Second); n != 1 {
		t.Fatalf("signals = %d, want 1", n)
	}
}

func TestWatchRenameSave(t *testing.T) {
	path, ch := start(t)
	tmp := path + ".tmp"
	os.WriteFile(tmp, []byte("renamed\n"), 0o644)
	if err := os.Rename(tmp, path); err != nil {
		t.Fatal(err)
	}
	if n := count(ch, time.Second); n != 1 {
		t.Fatalf("signals = %d, want 1", n)
	}
}

func TestWatchIgnoresOtherFiles(t *testing.T) {
	path, ch := start(t)
	os.WriteFile(filepath.Join(filepath.Dir(path), "other.py"), []byte("x\n"), 0o644)
	if n := count(ch, 500*time.Millisecond); n != 0 {
		t.Fatalf("signals = %d, want 0", n)
	}
}
