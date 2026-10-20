package cli

import (
	"fmt"
	"io"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/stats"
)

func printStats(a *app.App, out io.Writer) int {
	s := stats.Compute(a.Catalog, a.States(), a.Attempts(), a.Now(), a.Loc)
	fmt.Fprintf(out, "%s %s\n", th.Title.Render("streak"), th.Accent.Render(fmt.Sprint(s.Streak)))
	fmt.Fprintf(out, "%s %d  %s %d  %s %d  %s %d\n",
		th.Pass.Render("mastered"), s.Counts[schedule.Mastered], th.Accent.Render("reviewing"), s.Counts[schedule.Reviewing],
		th.Due.Render("learning"), s.Counts[schedule.Learning], th.Muted.Render("unseen"), s.Counts[schedule.Unseen])
	if len(s.Weakest) > 0 {
		fmt.Fprintln(out, th.Title.Render("weakest techniques:"))
		for _, w := range s.Weakest {
			fmt.Fprintf(out, "  %-40s fail %3.0f%%  hint %3.0f%%  (%d attempts)\n",
				w.Technique.Module.Title+" / "+w.Technique.Title, w.FailRate*100, w.HintRate*100, w.Attempts)
		}
	}
	for _, d := range []catalog.Difficulty{catalog.Easy, catalog.Medium, catalog.Hard} {
		if m, ok := s.MedianByDiff[d]; ok {
			fmt.Fprintf(out, "median %-6s %s (target %s)\n", d, m.Round(1e9), catalog.DefaultTimeTargets[d])
		}
	}
	return 0
}
