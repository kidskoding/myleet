package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefault(t *testing.T) {
	c := Default()
	if c.Timeout != 10*time.Second {
		t.Fatalf("Timeout = %v, want 10s", c.Timeout)
	}
	if c.NewPerDay != 3 {
		t.Fatalf("NewPerDay = %d, want 3", c.NewPerDay)
	}
}

func TestLoadFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.toml")
	if err := os.WriteFile(path, []byte("timeout = \"20s\"\nnew_per_day = 5\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := LoadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.Timeout != 20*time.Second || c.NewPerDay != 5 {
		t.Fatalf("got %+v", c)
	}
	if c.Python != "" || c.Editor != "" {
		t.Fatalf("unset fields should stay empty: %+v", c)
	}
}

func TestLoadMissingFileIsDefault(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c != Default() {
		t.Fatalf("got %+v", c)
	}
}

func TestDataDirXDG(t *testing.T) {
	d := t.TempDir()
	t.Setenv("XDG_DATA_HOME", d)
	if got := DataDir(); got != filepath.Join(d, "myleet") {
		t.Fatalf("DataDir() = %q", got)
	}
}

func TestDataDirFallback(t *testing.T) {
	t.Setenv("XDG_DATA_HOME", "")
	t.Setenv("HOME", "/home/x")
	if got := DataDir(); got != "/home/x/.local/share/myleet" {
		t.Fatalf("DataDir() = %q", got)
	}
}

func TestPathXDG(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "/cfg")
	if got := Path(); got != "/cfg/myleet/config.toml" {
		t.Fatalf("Path() = %q", got)
	}
}

func TestStateDirDefaultsToDataDir(t *testing.T) {
	t.Setenv("XDG_DATA_HOME", "/data")
	if got := Default().StateDirPath(); got != "/data/myleet" {
		t.Fatalf("StateDirPath() = %q", got)
	}
}

func TestStateDirFromConfigExpandsHome(t *testing.T) {
	t.Setenv("HOME", "/home/x")
	path := filepath.Join(t.TempDir(), "config.toml")
	os.WriteFile(path, []byte("state_dir = \"~/Dropbox/myleet\"\n"), 0o644)
	c, err := LoadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := c.StateDirPath(); got != "/home/x/Dropbox/myleet" {
		t.Fatalf("StateDirPath() = %q", got)
	}
}
