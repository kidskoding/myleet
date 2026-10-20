package cli

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/config"
	"github.com/kidskoding/myleet/internal/editor"
)

func doctor(a *app.App, stdout io.Writer) int {
	failed := 0
	report := func(ok bool, what, detail, fix string) {
		if ok {
			fmt.Fprintf(stdout, "%s  %-8s %s\n", okTag(), what, th.Muted.Render(detail))
			return
		}
		failed++
		fmt.Fprintf(stdout, "%s  %-8s %s\n      %s\n", failTag(), what, detail, th.Due.Render("fix: "+fix))
	}

	report(a.PythonErr == nil, "python", strings.Join(a.Runner.Python, " "), "run `uv sync` in "+a.Root)
	if a.PythonErr == nil {
		py := a.Runner.Python
		out, err := exec.Command(py[0], append(py[1:], "-m", "pytest", "--version")...).CombinedOutput()
		report(err == nil, "pytest", strings.TrimSpace(string(out)), "run `uv sync` in "+a.Root)
	}
	cmd, err := editor.Command(a.Config, "file.py")
	if err == nil {
		report(true, "editor", cmd.Path, "")
	} else {
		report(false, "editor", err.Error(), "export EDITOR=nvim")
	}
	data := config.DataDir()
	probe := filepath.Join(data, ".doctor")
	werr := os.MkdirAll(data, 0o755)
	if werr == nil {
		werr = os.WriteFile(probe, []byte("ok"), 0o644)
		os.Remove(probe)
	}
	report(werr == nil, "data", data, "make "+data+" writable")
	if save, _, err := saveFilePath(); err == nil {
		report(true, "save", save, "")
	}
	if failed > 0 {
		return 1
	}
	return 0
}
