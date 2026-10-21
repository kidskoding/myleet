package cli

import (
	"fmt"
	"io"
	"os"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/config"
)

func updateContent(stdout, stderr io.Writer) int {
	cwd, _ := os.Getwd()
	root, err := catalog.EnsureRoot(cwd, config.DataDir(), stderr)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	kind := catalog.RootKind(root, config.DataDir())
	if kind != "installed content" {
		fmt.Fprintf(stdout, "curriculum is a %s at %s\n", kind, root)
		fmt.Fprintln(stdout, "pull updates yourself with git, or unset MYLEET_ROOT to use the installed copy.")
		return 0
	}
	fmt.Fprintf(stdout, "updating %s …\n", root)
	if err := catalog.UpdateContent(root); err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	fmt.Fprintln(stdout, "curriculum up to date.")
	return 0
}
