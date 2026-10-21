package cli

import (
	"fmt"
	"io"
	"os"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/version"
)

const usage = `usage: myleet [command]

  myleet                            open today's session
  myleet open <id>                  open one problem
  myleet check [--solutions] [id]   run tests (attempts, or reference solutions)
  myleet validate                   check the curriculum loads
  myleet validate --lock            record problem ids so a rename cannot orphan saved progress
  myleet doctor                     check python, pytest, editor, data dir
  myleet stats                      print progress stats
  myleet prompts                    download problem statements for offline use
  myleet progress                   edit your save file (progress.toml) in $EDITOR
  myleet update                     pull the latest curriculum (installed content)
  myleet version                    print build version

Install the binary, then run myleet once — it clones the curriculum if needed:

  go install github.com/kidskoding/myleet/cmd/myleet@latest
  myleet doctor && myleet`

// StartTUI is set by cmd/myleet so cli tests do not import the TUI.
var StartTUI func(a *app.App, openID string) error

func Main(args []string) int { return Run(args, os.Stdout, os.Stderr) }

func Run(args []string, stdout, stderr io.Writer) int {
	stdout, stderr = colorWriter(stdout), colorWriter(stderr)
	cmd := ""
	if len(args) > 0 {
		cmd, args = args[0], args[1:]
	}
	switch cmd {
	case "version", "-v", "--version":
		fmt.Fprintln(stdout, version.String())
		return 0
	case "validate":
		return validate(args, stdout, stderr)
	case "progress":
		return editProgress(stdout, stderr)
	case "update":
		return updateContent(stdout, stderr)
	case "check", "doctor", "stats", "prompts", "", "open":
	case "-h", "--help", "help":
		fmt.Fprintln(stdout, usage)
		return 0
	default:
		fmt.Fprintln(stderr, usage)
		return 2
	}
	a, err := app.Load(stderr)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	switch cmd {
	case "check":
		return check(a, args, stdout, stderr)
	case "doctor":
		return doctor(a, stdout)
	case "stats":
		return printStats(a, stdout)
	case "prompts":
		return downloadPrompts(a, stdout)
	}
	openID := ""
	if cmd == "open" {
		if len(args) != 1 {
			fmt.Fprintln(stderr, "usage: myleet open <id>")
			return 2
		}
		if _, ok := a.Catalog.Problem(args[0]); !ok {
			fmt.Fprintf(stderr, "myleet: no problem %q\n", args[0])
			return 1
		}
		openID = args[0]
	}
	if StartTUI == nil {
		fmt.Fprintln(stderr, "myleet: TUI not available")
		return 1
	}
	if err := StartTUI(a, openID); err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	return 0
}
