package editor

import (
	"strings"
	"testing"

	"github.com/kidskoding/myleet/internal/config"
)

func args(t *testing.T, cfg config.Config) string {
	t.Helper()
	cmd, err := Command(cfg, "/w/attempt.py")
	if err != nil {
		t.Fatal(err)
	}
	return strings.Join(cmd.Args, " ")
}

func TestEditorOrder(t *testing.T) {
	t.Setenv("VISUAL", "vis")
	t.Setenv("EDITOR", "ed")
	cfg := config.Default()
	cfg.Editor = "code --wait"
	if got := args(t, cfg); got != "code --wait /w/attempt.py" {
		t.Fatalf("config: %q", got)
	}
	cfg.Editor = ""
	if got := args(t, cfg); got != "vis /w/attempt.py" {
		t.Fatalf("visual: %q", got)
	}
	t.Setenv("VISUAL", "")
	if got := args(t, cfg); got != "ed /w/attempt.py" {
		t.Fatalf("editor: %q", got)
	}
}

func TestEditorFallbackNone(t *testing.T) {
	t.Setenv("VISUAL", "")
	t.Setenv("EDITOR", "")
	t.Setenv("PATH", t.TempDir())
	if _, err := Command(config.Default(), "/w/a.py"); err == nil {
		t.Fatal("want error when no editor exists")
	}
}
