package editor

import (
	"errors"
	"os"
	"os/exec"
	"strings"

	"github.com/kidskoding/myleet/internal/config"
)

func Command(cfg config.Config, path string) (*exec.Cmd, error) {
	for _, candidate := range []string{cfg.Editor, os.Getenv("VISUAL"), os.Getenv("EDITOR")} {
		if fields := strings.Fields(candidate); len(fields) > 0 {
			return exec.Command(fields[0], append(fields[1:], path)...), nil
		}
	}
	for _, name := range []string{"nvim", "vim", "vi", "nano"} {
		if bin, err := exec.LookPath(name); err == nil {
			return exec.Command(bin, path), nil
		}
	}
	return nil, errors.New("no editor found: set $EDITOR or editor in ~/.config/myleet/config.toml")
}
