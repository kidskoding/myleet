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

type settingsKind int

const (
	skOverview settingsKind = iota
	skHeatmap
	skHint
	skWeak
	skReset
)

type Settings struct {
	s       *Shared
	cursor  int
	offset  int
	height  int
	confirm int // 0 idle, 1 first confirm, 2 final confirm
}

func NewSettings(s *Shared) *Settings { return &Settings{s: s} }

func (st *Settings) Title() string { return "stats" }

func (st *Settings) Tab() int { return 4 }

func (st *Settings) Help() []string {
	return []string{
		"↑/↓ j/k        move between sections",
		"pgup/pgdn      jump by a few sections",
		"g/G            top / bottom",
		"enter          reset (confirm with y twice)",
	}
}

func (st *Settings) OwnsKey(k string) bool {
	return st.confirm > 0 && (k == "y" || k == "n" || k == "esc")
}

func (st *Settings) summary() (stats.Summary, int) {
	now := st.s.Now()
	attempts := st.s.App.Attempts()
	sum := stats.Compute(st.s.App.Catalog, st.s.States(), attempts, now, st.s.App.Loc)
	finished := 0
	for _, a := range attempts {
		if a.Outcome != schedule.OutcomeNone {
			finished++
		}
	}
	return sum, finished
}

func (st *Settings) sections(sum stats.Summary, finished int) []settingsKind {
	out := []settingsKind{skOverview, skHeatmap}
	if finished == 0 {
		out = append(out, skHint)
	}
	if len(sum.Weakest) > 0 {
		out = append(out, skWeak)
	}
	return append(out, skReset)
}

func (st *Settings) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return st, nil
	}
	key := k.String()
	if st.confirm > 0 {
		switch key {
		case "y":
			if st.confirm == 1 {
				st.confirm = 2
				return st, nil
			}
			if err := st.s.App.ResetProgress(); err != nil {
				st.s.Toast("reset failed: " + err.Error())
			} else {
				st.s.Toast("Progress cleared. Welcome back. We will warm up again when you return.")
				st.cursor, st.offset = 0, 0
			}
			st.confirm = 0
		case "n", "esc":
			st.confirm = 0
		}
		return st, nil
	}
	sum, finished := st.summary()
	secs := st.sections(sum, finished)
	if len(secs) == 0 {
		return st, nil
	}
	st.cursor = min(st.cursor, len(secs)-1)
	page := max(min(2, len(secs)-1), 1)
	switch key {
	case "esc":
		return st, pop
	case "j", "down":
		st.cursor = min(st.cursor+1, len(secs)-1)
	case "k", "up":
		st.cursor = max(st.cursor-1, 0)
	case "ctrl+d", "pgdown":
		st.cursor = min(st.cursor+page, len(secs)-1)
	case "ctrl+u", "pgup":
		st.cursor = max(st.cursor-page, 0)
	case "g", "home":
		st.cursor = 0
	case "G", "end":
		st.cursor = len(secs) - 1
	case "enter":
		if secs[st.cursor] == skReset {
			st.confirm = 1
		}
	}
	return st, nil
}

func (st *Settings) Keys() []ui.Key {
	if st.confirm > 0 {
		return []ui.Key{{Key: "y", Label: "confirm"}, {Key: "n", Label: "cancel"}}
	}
	sum, finished := st.summary()
	secs := st.sections(sum, finished)
	keys := []ui.Key{{Key: "↑/↓", Label: "move"}, {Key: "pgup/pgdn", Label: "page"}}
	if len(secs) > 0 && secs[min(st.cursor, len(secs)-1)] == skReset {
		keys = append([]ui.Key{{Key: "enter", Label: "select"}}, keys...)
	}
	return keys
}

func (st *Settings) heatmap(sum stats.Summary, now time.Time, width int) (rows []string, weeks int) {
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

func (st *Settings) median(sum stats.Summary) string {
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

func (st *Settings) View(w, h int) string {
	th := st.s.Theme
	cardW := w - 4
	if st.confirm == 1 {
		return ui.ModalTone(th, "start fresh?",
			"This will wipe your save file, history, and practice attempts.\nCached problem statements stay. You will see the placement warm-up again.\n\n"+
				th.Fail.Bold(true).Render("y")+" continue    "+th.Muted.Render("n")+" never mind",
			w, h, ui.ToneFail)
	}
	if st.confirm == 2 {
		return ui.ModalTone(th, "really wipe everything?",
			"This is your last chance. Press y to erase everything. This cannot be undone.\n\n"+
				th.Fail.Bold(true).Render("y")+" erase everything    "+th.Muted.Render("n")+" keep my progress",
			w, h, ui.ToneFail)
	}

	now := st.s.Now()
	sum, finished := st.summary()
	secs := st.sections(sum, finished)
	if len(secs) == 0 {
		return strings.Join(padLines(nil, h), "\n")
	}
	st.cursor = min(st.cursor, len(secs)-1)
	st.height = max(h-1, 1)

	starts := make([]int, len(secs))
	lines := []string{""}
	for i, kind := range secs {
		active := i == st.cursor
		var card string
		switch kind {
		case skOverview:
			body := strings.Join([]string{
				th.Title.Render("Streak") + "    " + th.Title.Render(plural(sum.Streak, "day", "days")),
				th.Title.Render("Mastered") + "  " + th.Title.Render(fmt.Sprintf("%d / %d", sum.Mastery[0], sum.Mastery[1])),
				th.Title.Render("Median") + "    " + st.median(sum),
			}, "\n")
			card = ui.Card(th, "overview", body, cardW, active)
		case skHeatmap:
			heat, weeks := st.heatmap(sum, now, cardW-4)
			card = ui.Card(th, fmt.Sprintf("last %d weeks", weeks), strings.Join(heat, "\n"), cardW, active)
		case skHint:
			note := "No attempts yet. Finish a problem from your practice queue (1) to start your streak.\nYour weakest techniques show up here after a few attempts."
			card = ui.Card(th, "getting started", th.Muted.Render(note), cardW, active)
		case skWeak:
			var rows []string
			for _, ws := range sum.Weakest {
				name := ui.Pad(strings.ToLower(ws.Technique.Module.Title+" · "+ws.Technique.Title), 34)
				rows = append(rows, name+" "+ui.Bar(th, ws.FailRate, 16, ui.ToneFail)+
					th.Muted.Render(fmt.Sprintf("  fail %.0f%% · hint %.0f%%", ws.FailRate*100, ws.HintRate*100)))
			}
			card = ui.Card(th, "weakest techniques", strings.Join(rows, "\n"), cardW, active)
		case skReset:
			marker, title := "  ", th.Fail.Render("Reset all progress")
			if active {
				marker = th.Fail.Render("▸ ")
				title = th.Fail.Bold(true).Reverse(true).Render(" Reset all progress ")
			}
			body := marker + title + "\n\n" + th.Muted.Render("Want a clean slate? Press enter, then confirm with y twice.")
			card = ui.Card(th, "danger zone", body, cardW, active)
		}
		starts[i] = len(lines)
		lines = append(lines, indent(card, 2)...)
	}

	st.offset = scrollWindow(starts[st.cursor], st.offset, st.height)
	st.offset = max(min(st.offset, max(len(lines)-st.height, 0)), 0)
	end := min(st.offset+st.height, len(lines))
	return strings.Join(padLines(append([]string{}, lines[st.offset:end]...), st.height), "\n")
}
