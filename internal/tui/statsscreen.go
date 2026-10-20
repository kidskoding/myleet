package tui

import (
	"fmt"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/stats"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

const heatmapWeeks = 20

type Stats struct{ s *Shared }

func NewStats(s *Shared) Screen { return &Stats{s: s} }

func (st *Stats) Title() string { return "stats" }

func (st *Stats) Tab() int { return 4 }

func (st *Stats) Update(msg tea.Msg) (Screen, tea.Cmd) {
	if k, ok := msg.(tea.KeyPressMsg); ok && k.String() == "esc" {
		return st, pop
	}
	return st, nil
}

func (st *Stats) heatmap(sum stats.Summary, now time.Time) []string {
	th := st.s.Theme
	y, m, d := now.Date()
	today := time.Date(y, m, d, 0, 0, 0, 0, now.Location())
	monday := today.AddDate(0, 0, -((int(today.Weekday()) + 6) % 7))
	first := monday.AddDate(0, 0, -7*(heatmapWeeks-1))
	labels := []string{"mon", "", "wed", "", "fri", "", "sun"}
	var rows []string
	for wd := 0; wd < 7; wd++ {
		row := ui.Pad(labels[wd], 4)
		for week := 0; week < heatmapWeeks; week++ {
			day := first.AddDate(0, 0, week*7+wd)
			if day.After(today) {
				row += "  "
				continue
			}
			n := sum.Heatmap[day.Format("2006-01-02")]
			switch {
			case n == 0:
				row += th.Muted.Render("·") + " "
			case n == 1:
				row += th.Muted.Render("▪") + " "
			case n <= 3:
				row += th.Due.Render("▪") + " "
			default:
				row += th.Pass.Render("▪") + " "
			}
		}
		rows = append(rows, row)
	}
	return rows
}

func (st *Stats) Keys() []ui.Key { return []ui.Key{{Key: "1-5", Label: "tabs"}} }

func (st *Stats) median(sum stats.Summary) string {
	for _, d := range []catalog.Difficulty{catalog.Medium, catalog.Easy, catalog.Hard} {
		if m, ok := sum.MedianByDiff[d]; ok {
			style := st.s.Theme.Pass
			if m > catalog.DefaultTimeTargets[d] {
				style = st.s.Theme.Fail
			}
			return style.Render(mmss(m)) + st.s.Theme.Muted.Render(" vs "+mmss(catalog.DefaultTimeTargets[d])+" "+d.Short())
		}
	}
	return st.s.Theme.Muted.Render("no passes yet")
}

func (st *Stats) View(w, h int) string {
	th := st.s.Theme
	now := st.s.Now()
	attempts := st.s.App.Attempts()
	sum := stats.Compute(st.s.App.Catalog, st.s.States(), attempts, now, st.s.App.Loc)
	cardW := min(w-4, 100)
	finished := 0
	for _, a := range attempts {
		if a.Outcome != schedule.OutcomeNone {
			finished++
		}
	}
	if finished == 0 {
		empty := ui.Card(th, "stats", "No attempts yet. Finish a problem and your stats start here.", min(cardW, 72), false)
		return "\n" + strings.Join(indent(empty, 2), "\n")
	}

	total := len(st.s.App.Catalog.Problems())
	tileW := (cardW - 4) / 3
	tiles := ui.Columns(2,
		ui.Card(th, "streak", th.Title.Render(plural(sum.Streak, "day", "days")), tileW, false),
		ui.Card(th, "mastered", th.Title.Render(fmt.Sprintf("%d / %d", sum.Counts[schedule.Mastered], total)), tileW, false),
		ui.Card(th, "median", st.median(sum), tileW, false),
	)
	lines := append([]string{""}, indent(tiles, 2)...)
	lines = append(lines, indent(ui.Card(th, "last 20 weeks", strings.Join(st.heatmap(sum, now), "\n"), cardW, false), 2)...)
	if len(sum.Weakest) > 0 {
		var rows []string
		for _, ws := range sum.Weakest {
			name := ui.Pad(strings.ToLower(ws.Technique.Module.Title+" · "+ws.Technique.Title), 34)
			rows = append(rows, name+" "+ui.Bar(th, ws.FailRate, 16, ui.ToneFail)+
				th.Muted.Render(fmt.Sprintf("  fail %.0f%% · hint %.0f%%", ws.FailRate*100, ws.HintRate*100)))
		}
		lines = append(lines, indent(ui.Card(th, "weakest techniques", strings.Join(rows, "\n"), cardW, false), 2)...)
	}
	return strings.Join(lines, "\n")
}
