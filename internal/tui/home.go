package tui

import (
	"fmt"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/session"
	"github.com/kidskoding/myleet/internal/stats"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

type Home struct {
	s              *Shared
	cursor, offset int
}

func NewHome(s *Shared) *Home { return &Home{s: s} }

func (h *Home) Title() string { return "today" }

func (h *Home) Tab() int { return 0 }

func (h *Home) Help() []string {
	return []string{"enter  start the selected problem", "m      curriculum map", "i      interview simulator",
		"p      company playlists", "s      stats"}
}

func (h *Home) queue() []session.Item {
	return session.Today(h.s.App.Catalog, h.s.States(), h.s.Now(), h.s.App.Config.NewPerDay)
}

func (h *Home) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return h, nil
	}
	items := h.queue()
	switch k.String() {
	case "j", "down":
		h.cursor = min(h.cursor+1, max(len(items)-1, 0))
	case "k", "up":
		h.cursor = max(h.cursor-1, 0)
	case "enter":
		if h.cursor < len(items) {
			return h, push(NewFocus(h.s, items[h.cursor].Problem, progress.Practice))
		}
	case "m":
		return h, switchTab(1)
	case "i":
		return h, switchTab(2)
	case "p":
		return h, switchTab(3)
	case "s":
		return h, switchTab(4)
	}
	return h, nil
}

func (h *Home) Keys() []ui.Key {
	return []ui.Key{{Key: "enter", Label: "start"}, {Key: "↑/↓", Label: "move"}, {Key: "/", Label: "search"}}
}

func greeting(now time.Time) string {
	switch h := now.Hour(); {
	case h >= 5 && h < 12:
		return "Good morning"
	case h >= 12 && h < 17:
		return "Good afternoon"
	}
	return "Good evening"
}

func (h *Home) row(it session.Item, now time.Time, titleW, reasonW int, selected bool) string {
	th := h.s.Theme
	title := ui.Pad(it.Problem.Title, titleW)
	marker := "  "
	if selected {
		marker, title = th.Accent.Render("▸ "), th.Selected.Render(title)
	}
	kind := ui.Badge(th, "NEW", ui.BadgeNew) + "   "
	age := h.reason(it)
	if it.Kind == session.Review {
		kind = ui.Badge(th, "REVIEW", ui.BadgeReview)
		switch days := daysSince(it.State, now); {
		case it.OverdueDays > 0:
			age = th.Due.Render(fmt.Sprintf("late %dd", it.OverdueDays))
		case days > 0:
			age = th.Muted.Render(fmt.Sprintf("%dd ago", days))
		default:
			age = th.Due.Render("due")
		}
	}
	return marker + title + "  " + kind + "  " + difficultyBadge(th, it.Problem.Difficulty) + "  " + ui.Truncate(age, reasonW)
}

func (h *Home) reason(it session.Item) string {
	th := h.s.Theme
	style := th.Muted
	switch it.Reason {
	case session.ReasonWeak:
		style = th.Fail
	case session.ReasonInProgress:
		style = th.Accent
	}
	return style.Render(string(it.Reason)) + th.Muted.Render(" · "+strings.ToLower(it.Problem.Technique.Title))
}

func (h *Home) View(w, ht int) string {
	th := h.s.Theme
	now := h.s.Now()
	states := h.s.States()
	sum := stats.Compute(h.s.App.Catalog, states, h.s.App.Attempts(), now, h.s.App.Loc)
	items := h.queue()
	h.cursor = min(h.cursor, max(len(items)-1, 0))

	reviews, fresh := 0, 0
	for _, it := range items {
		if it.Kind == session.Review {
			reviews++
		} else {
			fresh++
		}
	}
	lines := []string{"", "  " + th.Title.Render(greeting(now)) + th.Muted.Render(" · "+plural(reviews, "review", "reviews")+fmt.Sprintf(" and %d new today", fresh))}
	if err := h.s.App.PythonErr; err != nil {
		lines = append(lines, "  "+th.Fail.Render("tests cannot run: "+err.Error()))
	}
	lines = append(lines, "")

	footer := []string{"", "  " + h.streakDots(sum, now) + "  " + th.Muted.Render(fmt.Sprintf("%d day streak", sum.Streak)) +
		"      " + th.Muted.Render("mastery ") + ui.Bar(th, frac(sum.Mastery[0], sum.Mastery[1]), 10, ui.TonePass) +
		th.Muted.Render(fmt.Sprintf("  %d/%d", sum.Mastery[0], sum.Mastery[1]))}

	if n := h.upcoming(states, now); n > 0 {
		footer = append([]string{"  " + th.Muted.Render(plural(n, "review", "reviews")+" due this week")}, footer...)
	}
	avail := max(ht-len(lines)-len(footer), 3)
	if len(items) == 0 {
		lines = append(lines, indent(ui.Card(th, "all caught up", "Pick something from the map (2) or run a mock interview (3).", w-4, false), 2)...)
	} else {
		cardW := w - 4
		inner := cardW - 4
		const fixed = 2 + 2 + 8 + 2 + 4 + 2 // marker, gaps, kind badge, difficulty
		longest, reasonNeed := 0, 0
		for _, it := range items {
			longest = max(longest, lipgloss.Width(it.Problem.Title))
			reasonNeed = max(reasonNeed, lipgloss.Width(h.reason(it)))
		}
		titleW := max(min(longest, inner-fixed-min(reasonNeed, 16)), 14)
		reasonW := max(inner-fixed-titleW, 0)
		visible := max(min(avail-2, len(items)), 1)
		h.offset = scrollWindow(h.cursor, h.offset, visible)
		var rows []string
		for i := h.offset; i < len(items) && len(rows) < visible; i++ {
			rows = append(rows, h.row(items[i], now, titleW, reasonW, i == h.cursor))
		}
		title := "today"
		if len(items) > visible {
			title = fmt.Sprintf("today · %d/%d", h.cursor+1, len(items))
		}
		lines = append(lines, indent(ui.Card(th, title, strings.Join(rows, "\n"), cardW, true), 2)...)
	}
	lines = padLines(lines, ht-len(footer))
	return strings.Join(append(lines[:max(ht-len(footer), 0)], footer...), "\n")
}

// upcoming counts reviews that come due in the next seven days, after today.
func (h *Home) upcoming(states map[string]schedule.State, now time.Time) int {
	y, m, d := now.Date()
	today := time.Date(y, m, d, 0, 0, 0, 0, now.Location())
	week := today.AddDate(0, 0, 7)
	n := 0
	for _, st := range states {
		if st.Status != schedule.Unseen && st.Due.After(today) && !st.Due.After(week) {
			n++
		}
	}
	return n
}

func (h *Home) streakDots(sum stats.Summary, now time.Time) string {
	days := make([]bool, 7)
	for i := range days {
		d := now.AddDate(0, 0, i-6).Format(time.DateOnly)
		days[i] = sum.Heatmap[d] > 0
	}
	return ui.Dots(h.s.Theme, days)
}

func daysSince(st schedule.State, now time.Time) int {
	last := st.LastFinished.In(now.Location())
	y1, m1, d1 := last.Date()
	y2, m2, d2 := now.Date()
	from := time.Date(y1, m1, d1, 0, 0, 0, 0, now.Location())
	to := time.Date(y2, m2, d2, 0, 0, 0, 0, now.Location())
	return int(to.Sub(from).Hours()+12) / 24
}
