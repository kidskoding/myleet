package cli

import (
	"fmt"
	"io"
	"os"

	"github.com/kidskoding/myleet/internal/catalog"
)

func validate(stdout, stderr io.Writer) int {
	cwd, _ := os.Getwd()
	root, err := catalog.FindRoot(cwd)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	c, err := catalog.Load(root)
	if err != nil {
		fmt.Fprintln(stderr, th.Fail.Render(err.Error()))
		return 1
	}
	curriculum := len(c.Curriculum())
	fmt.Fprintf(stdout, "%s %d curriculum problems, %d in the bank, %d playlists\n", th.Pass.Render("ok:"), curriculum, len(c.Problems())-curriculum, len(c.Playlists))
	return 0
}
