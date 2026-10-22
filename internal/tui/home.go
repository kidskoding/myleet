package tui

import (
	"fmt"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/kidskoding/myleet/internal/checkpoint"
	"github.com/kidskoding/myleet/internal/placement"
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
	if h.needsPlacement() {
		return []string{"enter  begin the placement warm-up", "n      skip the warm-up for now",
			"m      open the curriculum map", "i      open timed practice", "p      open playlists", "s      open stats"}
	}
	if keepSharpQueue(h.queue()) {
		return []string{"enter  start the selected interview drill",
			"m      open the curriculum map", "i      open a full timed mock", "p      open playlists", "s      open stats"}
	}
	return []string{"enter  start the selected problem", "c      start the recommended check-in", "n      snooze the check-in",
		"m      open the curriculum map", "i      open timed practice", "p      open playlists", "s      open stats"}
}

// OwnsKey claims "/" during the placement gate so search is not offered or opened.
func (h *Home) OwnsKey(k string) bool {
	return h.needsPlacement() && k == "/"
}

func (h *Home) needsPlacement() bool {
	return placement.Needs(h.s.App.Events, h.s.App.Attempts())
}

func (h *Home) queue() []session.Item {
	return session.TodayWithEvents(h.s.App.Catalog, h.s.States(), h.s.Now(), h.s.App.Config.NewPerDay, h.s.App.Events)
}

func (h *Home) suggestCheckpoint() int {
	return checkpoint.SuggestThrough(h.s.App.Catalog, h.s.App.Events, h.s.App.Attempts(), h.s.App.Now())
}

func (h *Home) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return h, nil
	}
	if h.needsPlacement() {
		switch k.String() {
		case "enter":
			pl, cmd := NewPlacementStart(h.s)
			return h, tea.Batch(push(pl), cmd)
		case "n":
			h.s.Record(progress.Event{
				Time: h.s.App.Now().UTC(), Kind: progress.PlacementDone, Mode: progress.Placement,
				Data: map[string]string{"skipped": "1"},
			})
			return h, nil
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
	items := h.queue()
	through := h.suggestCheckpoint()
	switch k.String() {
	case "j", "down":
		h.cursor = min(h.cursor+1, max(len(items)-1, 0))
	case "k", "up":
		h.cursor = max(h.cursor-1, 0)
	case "enter":
		if h.cursor < len(items) {
			mode := progress.Practice
			if items[h.cursor].Kind == session.Practice {
				mode = progress.Drill // keep-sharp: no ladder climb/drop
			}
			return h, push(NewFocus(h.s, items[h.cursor].Problem, mode))
		}
	case "c":
		if through > 0 {
			return h, push(NewInterviewCheckpoint(h.s))
		}
	case "n":
		if through > 0 {
			h.s.Record(progress.Event{
				Time: h.s.App.Now().UTC(), Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
				Data: checkpoint.Snooze(through),
			})
			return h, nil
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
	if h.needsPlacement() {
		return []ui.Key{{Key: "enter", Label: "begin"}, {Key: "n", Label: "skip for now"}}
	}
	sharp := keepSharpQueue(h.queue())
	startLabel := "start"
	if sharp {
		startLabel = "drill"
	}
	if h.suggestCheckpoint() > 0 {
		keys := []ui.Key{
			{Key: "enter", Label: startLabel}, {Key: "c", Label: "check-in"}, {Key: "n", Label: "snooze"},
			{Key: "↑/↓", Label: "move"},
		}
		if sharp {
			keys = append(keys, ui.Key{Key: "i", Label: "mock"})
		}
		return keys
	}
	if sharp {
		return []ui.Key{{Key: "enter", Label: "drill"}, {Key: "↑/↓", Label: "move"}, {Key: "i", Label: "mock"}, {Key: "/", Label: "search"}}
	}
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
	switch it.Kind {
	case session.Review:
		kind = ui.Badge(th, "REVIEW", ui.BadgeReview)
		switch days := daysSince(it.State, now); {
		case it.OverdueDays > 0:
			age = th.Due.Render(fmt.Sprintf("late %dd", it.OverdueDays))
		case days > 0:
			age = th.Muted.Render(fmt.Sprintf("%dd ago", days))
		default:
			age = th.Due.Render("due")
		}
	case session.Practice:
		kind = ui.Badge(th, "DRILL", ui.BadgeInfo) + "  "
	}
	return marker + title + "  " + kind + "  " + difficultyBadge(th, it.Problem.Difficulty) + "  " + ui.Truncate(age, reasonW)
}

func (h *Home) reason(it session.Item) string {
	th := h.s.Theme
	style := th.Muted
	switch it.Reason {
	case session.ReasonWeak, session.ReasonKeepSharp:
		style = th.Fail
	case session.ReasonInProgress, session.ReasonInterviewMix:
		style = th.Accent
	case session.ReasonColdRedo:
		style = th.Due
	}
	return style.Render(string(it.Reason)) + th.Muted.Render(" · "+strings.ToLower(it.Problem.Technique.Title))
}

func keepSharpQueue(items []session.Item) bool {
	if len(items) == 0 {
		return false
	}
	for _, it := range items {
		if it.Kind != session.Practice {
			return false
		}
	}
	return true
}

func (h *Home) placementWarmupCard(width int) string {
	th := h.s.Theme
	var steps []string
	for i, s := range placement.DefaultSlots {
		steps = append(steps, th.Muted.Render("○  ")+fmt.Sprintf("%d. %s", i+1, s.Topic))
	}
	body := strings.Join([]string{
		"We will walk you through a few easy problems, each with an interview-style",
		"timer (usually 15 minutes). Going over or using a hint tells us that topic",
		"still needs practice. Skip any topic you want.",
		"",
		"You will cover:",
		strings.Join(steps, "\n"),
		"",
		th.Accent.Render("enter") + " begin the warm-up    " + th.Muted.Render("n") + " skip for now",
	}, "\n")
	return ui.Card(th, "placement warm-up", body, width, true)
}

func (h *Home) howTodayWorksCard(width int) string {
	th := h.s.Theme
	body := strings.Join([]string{
		"When you finish, we will put together a practice plan based on how it went.",
		"",
		"Here is what we will include:",
		th.Muted.Render("•") + " reviews that are ready for you",
		th.Muted.Render("•") + " topics that felt shaky in the warm-up",
		th.Muted.Render("•") + " new problems as you keep learning",
		"",
		"Explore the full curriculum anytime from the " + th.Accent.Render("map (2)") + ".",
		"We will keep adjusting your plan as you grow.",
	}, "\n")
	return ui.Card(th, "what happens next", body, width, false)
}

func (h *Home) checkpointCard(through, width int) string {
	th := h.s.Theme
	title := checkpoint.ModuleTitle(h.s.App.Catalog, through)
	body := "You have put in a good stretch of practice. When you are ready, we will\n" +
		"give you a few timed problems on what you have learned through " + title + ",\n" +
		"then refresh your plan.\n\n" +
		th.Accent.Render("c") + " start the check-in    " + th.Muted.Render("n") + " remind me later"
	return ui.Card(th, "recommended check-in", body, width, true)
}

func (h *Home) youCard(sum stats.Summary, states map[string]schedule.State, now time.Time, width int, sharp, compact bool) string {
	th := h.s.Theme
	lines := []string{
		th.Title.Render("Practice streak") + "  " + h.streakDots(sum, now) + "  " + th.Muted.Render(fmt.Sprintf("%d day streak", sum.Streak)),
		th.Title.Render("Mastery") + "         " + ui.Bar(th, frac(sum.Mastery[0], sum.Mastery[1]), 10, ui.TonePass) +
			th.Muted.Render(fmt.Sprintf("  %d/%d problems", sum.Mastery[0], sum.Mastery[1])),
	}
	if !compact {
		if n := h.upcoming(states, now); n > 0 {
			lines = append(lines, th.Muted.Render(fmt.Sprintf("%s coming due this week.", plural(n, "review", "reviews"))))
		}
		if sharp {
			lines = append(lines, "",
				th.Title.Render("Stay interview-ready"),
				th.Muted.Render("Nothing is due, so we queued drills across"),
				th.Muted.Render("techniques: cold redos and shaky spots first."),
				th.Muted.Render("Drills do not change your review schedule."),
				th.Muted.Render("A full mock is always on tab ")+th.Accent.Render("3")+".",
			)
		} else if len(sum.Weakest) > 0 {
			n := min(len(sum.Weakest), 3)
			names := make([]string, n)
			for i := 0; i < n; i++ {
				names[i] = strings.ToLower(sum.Weakest[i].Technique.Title)
			}
			lines = append(lines, "",
				th.Title.Render("Where to focus"),
				th.Muted.Render(strings.Join(names, ", ")+"."),
				th.Muted.Render("These have been difficult lately,"),
				th.Muted.Render("so we will prioritize them for you."),
			)
		}
	}
	return ui.Card(th, "your progress", strings.Join(lines, "\n"), width, false)
}

func (h *Home) queueCard(items []session.Item, now time.Time, width, bodyRows int) string {
	th := h.s.Theme
	if len(items) == 0 {
		body := strings.Join([]string{
			"No reviews due and nothing left to introduce yet.",
			"When you are ready for more practice:",
			"",
			th.Accent.Render("2") + "  open the curriculum map",
			th.Accent.Render("3") + "  start a timed mock interview",
			th.Accent.Render("/") + "  search for a specific problem",
		}, "\n")
		return ui.Card(th, "you're all caught up", body, width, false)
	}
	sharp := keepSharpQueue(items)
	inner := width - 4
	const fixed = 2 + 2 + 8 + 2 + 4 + 2
	longest, reasonNeed := 0, 0
	for _, it := range items {
		longest = max(longest, lipgloss.Width(it.Problem.Title))
		reasonNeed = max(reasonNeed, lipgloss.Width(h.reason(it)))
	}
	titleW := max(min(longest, inner-fixed-min(reasonNeed, 16)), 14)
	reasonW := max(inner-fixed-titleW, 0)
	bodyRows = max(bodyRows, 1)
	// Pitch only when there is room for it plus at least one problem row.
	showPitch := sharp && bodyRows >= 2
	listBudget := bodyRows
	if showPitch {
		listBudget = bodyRows - 1
	}
	visible := max(min(listBudget, len(items)), 1)
	h.offset = scrollWindow(h.cursor, h.offset, visible)
	var rows []string
	if showPitch {
		// Pitch stays with the drills so a check-in card never buries it.
		rows = append(rows, th.Muted.Render("Cold redos & shaky spots · drills leave your schedule alone"))
	}
	for i := h.offset; i < len(items) && len(rows) < bodyRows; i++ {
		rows = append(rows, h.row(items[i], now, titleW, reasonW, i == h.cursor))
	}
	for len(rows) < bodyRows {
		rows = append(rows, "")
	}
	title := "today"
	if sharp {
		title = "keep sharp"
	}
	if len(items) > visible {
		title = fmt.Sprintf("%s · %d/%d", title, h.cursor+1, len(items))
	}
	return ui.Card(th, title, strings.Join(rows, "\n"), width, true)
}

func (h *Home) View(w, ht int) string {
	th := h.s.Theme
	now := h.s.Now()
	states := h.s.States()
	attempts := h.s.App.Attempts()
	sum := stats.Compute(h.s.App.Catalog, states, attempts, now, h.s.App.Loc)
	cardW := w - 4

	if h.needsPlacement() {
		return h.viewPlacement(w, ht, cardW, now)
	}

	items := h.queue()
	h.cursor = min(h.cursor, max(len(items)-1, 0))
	sharp := keepSharpQueue(items)

	reviews, fresh, drills := 0, 0, 0
	for _, it := range items {
		switch it.Kind {
		case session.Review:
			reviews++
		case session.Practice:
			drills++
		default:
			fresh++
		}
	}
	finished := 0
	for _, a := range attempts {
		if a.Outcome != schedule.OutcomeNone {
			finished++
		}
	}

	sub := plural(reviews, "review", "reviews") + fmt.Sprintf(" and %d new today", fresh)
	if sharp {
		sub = "keep sharp · " + plural(drills, "interview drill", "interview drills")
	}
	lines := []string{"", "  " + th.Title.Render(greeting(now)) + th.Muted.Render(" · "+sub)}
	if err := h.s.App.PythonErr; err != nil {
		lines = append(lines, "  "+th.Fail.Render("tests cannot run: "+err.Error()))
	}
	if finished == 0 {
		lines = append(lines, ui.Truncate("  "+th.Muted.Render("Complete a few problems and we will learn where you are strongest."), w))
	} else if sharp {
		lines = append(lines, ui.Truncate("  "+th.Muted.Render("Curriculum on track: drills below keep you interview-ready."), w))
	}
	lines = append(lines, "")

	if through := h.suggestCheckpoint(); through > 0 {
		lines = append(lines, indent(h.checkpointCard(through, cardW), 2)...)
		lines = append(lines, "")
	}

	avail := max(ht-len(lines), 4)
	const gap = 2
	leftW, rightW, sideBySide := ui.SplitRow(cardW, gap)

	var panels string
	if sideBySide {
		you := h.youCard(sum, states, now, rightW, sharp, false)
		queueRows := max(avail-2, 1)
		queue := h.queueCard(items, now, leftW, queueRows)
		panels = ui.JoinPanels(queue, you, gap, cardW)
	} else {
		// Stacked (half-width panes): shrink the queue first, then compact
		// progress, so "your progress" is never clipped by fitHeight.
		const stackGap = 2 // blank line JoinPanels inserts between cards
		you := h.youCard(sum, states, now, cardW, sharp, false)
		youH := lipgloss.Height(you)
		queueRows := avail - youH - stackGap - 2 // -2 card chrome
		if queueRows < 1 {
			you = h.youCard(sum, states, now, cardW, sharp, true)
			youH = lipgloss.Height(you)
			queueRows = avail - youH - stackGap - 2
		}
		queueRows = max(queueRows, 1)
		queue := h.queueCard(items, now, cardW, queueRows)
		panels = ui.JoinPanels(queue, you, gap, cardW)
		// If chrome still overflows, drop queue padding by rebuilding tighter.
		if lipgloss.Height(panels) > avail {
			queueRows = max(avail-youH-stackGap-2, 1)
			queue = h.queueCard(items, now, cardW, queueRows)
			panels = ui.JoinPanels(queue, you, gap, cardW)
		}
	}
	lines = append(lines, indent(panels, 2)...)
	return strings.Join(fitHeight(lines, ht), "\n")
}

func (h *Home) viewPlacement(w, ht, cardW int, now time.Time) string {
	th := h.s.Theme
	lines := []string{
		"",
		ui.Truncate("  "+th.Title.Render(greeting(now))+th.Muted.Render(" · let's find the right place for you to begin"), w),
		"",
	}
	if err := h.s.App.PythonErr; err != nil {
		lines = append(lines, ui.Truncate("  "+th.Fail.Render("tests cannot run: "+err.Error()), w), "")
	}
	const gap = 2
	leftW, rightW, sideBySide := ui.SplitRow(cardW, gap)
	var panels string
	if sideBySide {
		panels = ui.JoinPanels(h.placementWarmupCard(leftW), h.howTodayWorksCard(rightW), gap, cardW)
	} else {
		panels = ui.JoinPanels(h.placementWarmupCard(cardW), h.howTodayWorksCard(cardW), gap, cardW)
	}
	lines = append(lines, indent(panels, 2)...)
	return strings.Join(fitHeight(lines, ht), "\n")
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
