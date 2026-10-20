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

func (st *Stats) heatmap(sum stats.Summary, now time.Time, width int) (rows []string, weeks int) {
	weeks = min(max((width-6)/2, 8), 52)
	th := st.s.Theme
	y, m, d := now.Date()
	today := time.Date(y, m, d, 0, 0, 0, 0, now.Location())
	monday := today.AddDate(0, 0, -((int(today.Weekday()) + 6) % 7))
	first := monday.AddDate(0, 0, -7*(weeks-1))
	labels := []string{"mon", "", "wed", "", "fri", "", "sun"}
	for wd := 0; wd < 7; wd++ {
		row := ui.Pad(labels[wd], 4)
		for week := 0; week < weeks; week++ {
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
	return rows, weeks
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
	cardW := w - 4
	finished := 0
	for _, a := range attempts {
		if a.Outcome != schedule.OutcomeNone {
			finished++
		}
	}
	tileW := (cardW - 4) / 3
	tiles := ui.Columns(2,
		ui.Card(th, "streak", th.Title.Render(plural(sum.Streak, "day", "days")), tileW, false),
		ui.Card(th, "mastered", th.Title.Render(fmt.Sprintf("%d / %d", sum.Mastery[0], sum.Mastery[1])), tileW, false),
		ui.Card(th, "median", st.median(sum), cardW-4-2*tileW, false),
	)
	lines := append([]string{""}, indent(tiles, 2)...)
	heat, weeks := st.heatmap(sum, now, cardW-4)
	lines = append(lines, indent(ui.Card(th, fmt.Sprintf("last %d weeks", weeks), strings.Join(heat, "\n"), cardW, false), 2)...)
	if finished == 0 {
		note := "No attempts yet. Finish a problem from Today (1) to start your streak;\nyour weakest techniques show up here after a few attempts."
		lines = append(lines, indent(ui.Card(th, "getting started", th.Muted.Render(note), cardW, false), 2)...)
	}
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
