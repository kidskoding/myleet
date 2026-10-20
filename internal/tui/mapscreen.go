package tui

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

const (
	wideMap   = 100
	columnGap = 2
)

type Map struct {
	s               *Shared
	level           int
	mod, tech, prob int
	offsets         [3]int
}

func NewMap(s *Shared) Screen { return &Map{s: s} }

func (m *Map) Title() string { return "map" }

func (m *Map) Tab() int { return 1 }

func (m *Map) Help() []string {
	return []string{"→/enter  drill in (enter on a problem opens it)", "←/esc    back out", "n        open the note for this module or technique"}
}

func (m *Map) guide() []catalog.GuideNote { return m.s.App.Catalog.Guide }

// onGuide reports whether the cursor is on Start here, the row above the modules.
func (m *Map) onGuide() bool { return len(m.guide()) > 0 && m.mod == 0 }

func (m *Map) module() *catalog.Module {
	if len(m.guide()) > 0 {
		return m.s.App.Catalog.Modules[max(m.mod-1, 0)]
	}
	return m.s.App.Catalog.Modules[m.mod]
}

func (m *Map) technique() *catalog.Technique {
	if m.onGuide() {
		return nil
	}
	ts := m.module().Techniques
	if len(ts) == 0 {
		return nil
	}
	return ts[min(m.tech, len(ts)-1)]
}

func (m *Map) problems() []*catalog.Problem {
	if t := m.technique(); t != nil {
		return t.Problems
	}
	return nil
}

func (m *Map) cursor() *int { return [...]*int{&m.mod, &m.tech, &m.prob}[m.level] }

func (m *Map) size(level int) int {
	switch level {
	case 0:
		n := len(m.s.App.Catalog.Modules)
		if len(m.guide()) > 0 {
			n++
		}
		return n
	case 1:
		if m.onGuide() {
			return len(m.guide())
		}
		return len(m.module().Techniques)
	}
	return len(m.problems())
}

func (m *Map) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return m, nil
	}
	c := m.cursor()
	switch k.String() {
	case "j", "down":
		*c = min(*c+1, max(m.size(m.level)-1, 0))
	case "k", "up":
		*c = max(*c-1, 0)
	case "l", "enter", "right":
		if m.onGuide() && m.level == 1 {
			return m, push(NewNotes(m.s, m.guide()[m.tech].Path))
		}
		if m.level == 2 {
			if ps := m.problems(); m.prob < len(ps) && k.String() == "enter" {
				return m, push(NewFocus(m.s, ps[m.prob], progress.Practice))
			}
			return m, nil
		}
		if m.size(m.level+1) > 0 {
			m.level++
			*m.cursor() = 0
		}
	case "h", "esc", "left":
		if m.level == 0 {
			if k.String() == "esc" {
				return m, pop
			}
			return m, nil
		}
		m.level--
	case "n":
		if note := m.note(); note != "" {
			return m, push(NewNotes(m.s, note))
		}
		m.s.Toast("no notes for " + m.title())
	}
	if m.level == 0 {
		m.tech, m.prob = 0, 0
	} else if m.level == 1 {
		m.prob = 0
	}
	return m, nil
}

func (m *Map) title() string {
	if m.onGuide() {
		return "Start here"
	}
	return m.module().Title
}

func (m *Map) note() string {
	if m.onGuide() {
		return m.guide()[min(m.tech, len(m.guide())-1)].Path
	}
	if m.level > 0 {
		if t := m.technique(); t != nil && t.Note != "" {
			return t.Note
		}
	}
	if notes := m.module().Notes; len(notes) > 0 {
		return notes[0]
	}
	return ""
}

func (m *Map) dueBy(now time.Time) time.Time {
	y, mo, d := now.Date()
	return time.Date(y, mo, d, 0, 0, 0, 0, now.Location())
}

func (m *Map) moduleRows(states map[string]schedule.State, width int) []string {
	th := m.s.Theme
	var rows []string
	if n := len(m.guide()); n > 0 {
		meta := th.Muted.Render(fmt.Sprintf(" %d notes", n))
		rows = append(rows, ui.Pad(th.Accent.Render("Start here"), max(width-lipgloss.Width(meta), 4))+meta)
	}
	for _, mod := range m.s.App.Catalog.Modules {
		mastered, total := 0, 0
		for _, t := range mod.Techniques {
			for _, p := range t.Problems {
				total++
				if statusOf(states, p.ID).Status == schedule.Mastered {
					mastered++
				}
			}
		}
		meter := " " + ui.Bar(th, frac(mastered, total), 10, ui.TonePass) + th.Muted.Render(fmt.Sprintf(" %3.0f%%", 100*frac(mastered, total)))
		name := mod.Title
		if !mod.Bank {
			name = th.Muted.Render(fmt.Sprintf("%02d ", mod.Number)) + name
		}
		rows = append(rows, ui.Pad(name, max(width-lipgloss.Width(meter), 4))+meter)
	}
	return rows
}

func (m *Map) techniqueRows(states map[string]schedule.State, today time.Time, width int) []string {
	th := m.s.Theme
	var rows []string
	if m.onGuide() {
		for _, g := range m.guide() {
			rows = append(rows, ui.Pad(g.Title, width))
		}
		return rows
	}
	for _, t := range m.module().Techniques {
		mastered, due := 0, 0
		for _, p := range t.Problems {
			st := statusOf(states, p.ID)
			if st.Status == schedule.Mastered {
				mastered++
			}
			if st.Status != schedule.Unseen && !st.Due.After(today) {
				due++
			}
		}
		meta := th.Muted.Render(fmt.Sprintf(" %d/%d", mastered, len(t.Problems)))
		if due > 0 {
			meta = " " + ui.Badge(th, fmt.Sprintf("%d due", due), ui.BadgeReview) + meta
		}
		rows = append(rows, ui.Pad(t.Title, max(width-lipgloss.Width(meta), 4))+meta)
	}
	return rows
}

func (m *Map) problemRows(states map[string]schedule.State, width int) []string {
	th := m.s.Theme
	var rows []string
	for _, p := range m.problems() {
		badge := " " + difficultyBadge(th, p.Difficulty)
		rows = append(rows, glyph(th, statusOf(states, p.ID).Status)+" "+ui.Pad(p.Title, max(width-2-lipgloss.Width(badge), 4))+badge)
	}
	return rows
}

// guidePreview is the opening paragraph of the selected guide note.
func (m *Map) guidePreview(width int) []string {
	data, err := readFile(m.note())
	if err != nil {
		return []string{err.Error()}
	}
	var para []string
	for _, line := range strings.Split(data, "\n") {
		line = strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(line, "#"):
		case line == "" && len(para) > 0:
			return m.previewRows(para, width)
		case line != "":
			para = append(para, strings.NewReplacer("**", "", "`", "").Replace(line))
		}
	}
	return m.previewRows(para, width)
}

func clip(lines []string, n int) []string { return lines[:min(len(lines), max(n, 0))] }

func (m *Map) previewRows(para []string, width int) []string {
	rows := strings.Split(ansi.Wordwrap(strings.Join(para, " "), max(width, 1), ""), "\n")
	return append(rows, "", m.s.Theme.Muted.Render("enter to read"))
}

// column marks the selection in levels above the current one so the path stays visible.
func (m *Map) column(level int, title string, rows []string, width, height int) string {
	th := m.s.Theme
	cursor := *[...]*int{&m.mod, &m.tech, &m.prob}[level]
	visible := max(height-2, 1)
	m.offsets[level] = scrollWindow(cursor, m.offsets[level], visible)
	var body []string
	for i := m.offsets[level]; i < len(rows) && i < m.offsets[level]+visible; i++ {
		marker := "  "
		switch {
		case i == cursor && level == m.level:
			marker = th.Accent.Render("▸ ")
		case i == cursor && level < m.level:
			marker = th.Muted.Render("› ")
		}
		body = append(body, marker+rows[i])
	}
	return ui.Card(th, title, strings.Join(padLines(body, visible), "\n"), width, level == m.level)
}

func (m *Map) Keys() []ui.Key {
	return []ui.Key{{Key: "enter", Label: "open"}, {Key: "←", Label: "back"}, {Key: "n", Label: "notes"}}
}

func (m *Map) View(w, h int) string {
	states := m.s.States()
	today := m.dueBy(m.s.Now())
	height := max(h-1, 5)
	techTitle := ""
	if t := m.technique(); t != nil {
		techTitle = strings.ToLower(t.Title)
	}
	if w >= wideMap {
		avail := w - 4 - 2*columnGap
		mod, tech := min(42, avail*4/10), min(36, avail*35/100)
		widths := [3]int{mod, tech, avail - mod - tech}
		cols := []string{
			m.column(0, "modules", m.moduleRows(states, widths[0]-6), widths[0], height),
			m.column(1, strings.ToLower(m.title()), m.techniqueRows(states, today, widths[1]-6), widths[1], height),
			m.column(2, techTitle, m.problemRows(states, widths[2]-6), widths[2], height),
		}
		if m.onGuide() {
			cols[2] = ui.Card(m.s.Theme, strings.ToLower(m.guide()[m.tech].Title), strings.Join(padLines(clip(m.guidePreview(widths[2]-4), height-2), height-2), "\n"), widths[2], false)
		}
		return "\n" + strings.Join(indent(ui.Columns(columnGap, cols...), 2), "\n")
	}
	crumbs := []string{"map"}
	if m.level >= 1 {
		crumbs = append(crumbs, strings.ToLower(m.title()))
	}
	if m.level == 2 {
		crumbs = append(crumbs, techTitle)
	}
	inner := w - 4
	rows := [3][]string{}
	switch m.level {
	case 0:
		rows[0] = m.moduleRows(states, inner-6)
	case 1:
		rows[1] = m.techniqueRows(states, today, inner-6)
	default:
		rows[2] = m.problemRows(states, inner-6)
	}
	return "\n" + strings.Join(indent(m.column(m.level, strings.Join(crumbs, " › "), rows[m.level], inner, height), 2), "\n")
}

type Notes struct {
	s      *Shared
	path   string
	lines  []string
	width  int
	offset int
	height int
}

func NewNotes(s *Shared, path string) Screen { return &Notes{s: s, path: path} }

func (n *Notes) Title() string { return strings.TrimSuffix(filepath.Base(n.path), ".md") }

func (n *Notes) Help() []string {
	return []string{"↑/↓ j/k        scroll", "pgup/pgdn      half page", "home/end g/G   top/bottom", "esc            back"}
}

func (n *Notes) render(w int) {
	if n.lines != nil && n.width == w {
		return
	}
	n.width = w
	data, err := readFile(n.path)
	if err != nil {
		n.lines = []string{err.Error()}
		return
	}
	n.lines = strings.Split(renderMarkdown(data, w-4), "\n")
}

func (n *Notes) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return n, nil
	}
	page := max(n.height/2, 1)
	switch k.String() {
	case "j", "down":
		n.offset++
	case "k", "up":
		n.offset--
	case "ctrl+d", "pgdown", "space":
		n.offset += page
	case "ctrl+u", "pgup":
		n.offset -= page
	case "g", "home":
		n.offset = 0
	case "G", "end":
		n.offset = len(n.lines)
	case "esc":
		return n, pop
	}
	return n, nil
}

func (n *Notes) Keys() []ui.Key {
	return []ui.Key{{Key: "↑/↓", Label: "scroll"}, {Key: "pgup/pgdn", Label: "page"}, {Key: "esc", Label: "back"}}
}

func (n *Notes) View(w, h int) string {
	n.render(w - 4)
	n.height = max(h-3, 1)
	n.offset = max(min(n.offset, len(n.lines)-n.height), 0)
	end := min(n.offset+n.height, len(n.lines))
	pct := 100
	if len(n.lines) > n.height {
		pct = end * 100 / len(n.lines)
	}
	body := padLines(append([]string{}, n.lines[n.offset:end]...), n.height)
	card := ui.Card(n.s.Theme, fmt.Sprintf("%s · %d%%", n.Title(), pct), strings.Join(body, "\n"), w-4, false)
	return "\n" + strings.Join(indent(card, 2), "\n")
}
