package cli

import (
	"fmt"
	"io"
	"os"
	"slices"
	"strings"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/config"
)

func validate(args []string, stdout, stderr io.Writer) int {
	cwd, _ := os.Getwd()
	root, err := catalog.EnsureRoot(cwd, config.DataDir(), stderr)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	c, err := catalog.Load(root)
	if err != nil {
		fmt.Fprintln(stderr, th.Fail.Render(err.Error()))
		return 1
	}
	ids := c.IDs()
	if slices.Contains(args, "--lock") {
		if err := catalog.WriteLock(root, ids); err != nil {
			fmt.Fprintln(stderr, "myleet:", err)
			return 1
		}
	}
	locked, err := catalog.ReadLock(root)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	var missing []string
	for _, id := range locked {
		if _, ok := c.Problem(id); !ok {
			missing = append(missing, id)
		}
	}
	if len(missing) > 0 {
		fmt.Fprintln(stderr, th.Fail.Render(fmt.Sprintf("%d locked problem ids are gone: %s", len(missing), strings.Join(missing, ", "))))
		fmt.Fprintln(stderr, "saved progress is keyed by id, so learners would lose it. Restore the ids, or run `myleet validate --lock` if the removal is deliberate.")
		return 1
	}
	curriculum := len(c.Curriculum())
	fmt.Fprintf(stdout, "%s %d curriculum problems, %d playlist-only, %d playlists\n", th.Pass.Render("ok:"), curriculum, len(ids)-curriculum, len(c.Playlists))
	if fresh := len(ids) - len(locked); locked != nil && fresh > 0 {
		fmt.Fprintf(stdout, "%s %d new problem ids are not in %s yet; run `myleet validate --lock`\n", th.Due.Render("note:"), fresh, catalog.LockFile)
	}
	return 0
}
