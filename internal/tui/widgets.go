package tui

import (
	"fmt"
	"os"
	"strings"
	"time"

	"charm.land/lipgloss/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/theme"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

func spread(left, right string, w int) string {
	gap := w - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		return left + " " + right
	}
	return left + strings.Repeat(" ", gap) + right
}

func glyph(th theme.Theme, st schedule.Status) string {
	switch st {
	case schedule.Learning:
		return th.Due.Render("○")
	case schedule.Reviewing:
		return th.Accent.Render("◐")
	case schedule.Mastered:
		return th.Pass.Render("●")
	}
	return th.Muted.Render("·")
}

func statusOf(states map[string]schedule.State, id string) schedule.State {
	st, ok := states[id]
	if !ok {
		return schedule.State{Status: schedule.Unseen, Rung: -1}
	}
	return st
}

func dateLabel(t time.Time) string { return strings.ToLower(t.Format("Mon Jan 2")) }

func mmss(d time.Duration) string {
	d = max(d, 0).Truncate(time.Second)
	return fmt.Sprintf("%02d:%02d", int(d.Minutes()), int(d.Seconds())%60)
}

func scrollWindow(cursor, offset, rows int) int {
	if rows <= 0 {
		return cursor
	}
	if cursor < offset {
		return cursor
	}
	if cursor >= offset+rows {
		return cursor - rows + 1
	}
	return offset
}

func padLines(lines []string, n int) []string {
	for len(lines) < n {
		lines = append(lines, "")
	}
	return lines
}

func fitHeight(lines []string, n int) []string {
	if n <= 0 {
		return nil
	}
	if len(lines) > n {
		lines = lines[:n]
	}
	return padLines(lines, n)
}

func readFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	return string(data), err
}

func plural(n int, one, many string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, one)
	}
	return fmt.Sprintf("%d %s", n, many)
}

func frac(n, total int) float64 {
	if total == 0 {
		return 0
	}
	return float64(n) / float64(total)
}

func indent(block string, n int) []string {
	pad := strings.Repeat(" ", n)
	ls := strings.Split(block, "\n")
	for i := range ls {
		ls[i] = pad + ls[i]
	}
	return ls
}

func difficultyBadge(th theme.Theme, d catalog.Difficulty) string {
	switch d {
	case catalog.Easy:
		return ui.Badge(th, "easy", ui.BadgeEasy)
	case catalog.Hard:
		return ui.Badge(th, "hard", ui.BadgeHard)
	}
	return ui.Badge(th, "med ", ui.BadgeMedium)
}
