package runner

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/kidskoding/myleet/internal/config"
)

// ResolvePython prefers the repo's .venv over `uv run`, which can resolve a
// python without pytest.
func ResolvePython(cfg config.Config, root string) ([]string, error) {
	if cfg.Python != "" {
		return strings.Fields(cfg.Python), nil
	}
	if env := os.Getenv("MYLEET_PYTHON"); env != "" {
		return strings.Fields(env), nil
	}
	venv := filepath.Join(root, ".venv", "bin", "python")
	if _, err := os.Stat(venv); err == nil {
		return []string{venv}, nil
	}
	if uv, err := exec.LookPath("uv"); err == nil {
		return []string{uv, "run", "--project", root, "python"}, nil
	}
	if py, err := exec.LookPath("python3"); err == nil {
		return []string{py}, nil
	}
	return nil, errors.New("no python found: run `uv sync` in the repo, or set python in ~/.config/myleet/config.toml")
}
