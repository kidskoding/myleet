package cli

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/config"
	"github.com/kidskoding/myleet/internal/editor"
	"github.com/kidskoding/myleet/internal/version"
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

	fmt.Fprintln(stdout, version.String())
	kind := catalog.RootKind(a.Root, config.DataDir())
	report(true, "root", fmt.Sprintf("%s (%s)", a.Root, kind), "")
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
	var orphaned []string
	for id := range a.States() {
		if _, ok := a.Catalog.Problem(id); !ok {
			orphaned = append(orphaned, id)
		}
	}
	slices.Sort(orphaned)
	if len(orphaned) > 0 {
		report(false, "progress", fmt.Sprintf("saved progress for %d problems no longer in the catalog: %s", len(orphaned), strings.Join(orphaned, ", ")),
			"restore those problem ids in the repo, or delete their blocks with `myleet progress`")
	}
	if failed > 0 {
		return 1
	}
	return 0
}
