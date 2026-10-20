package tui

import (
	"fmt"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/sahilm/fuzzy"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

const searchLimit = 12

type Search struct {
	s      *Shared
	query  string
	cursor int
	hay    []string
}

func NewSearch(s *Shared) Screen {
	sr := &Search{s: s}
	for _, p := range s.App.Catalog.Problems() {
		sr.hay = append(sr.hay, p.Title+" "+p.Technique.Title+" "+p.Technique.Module.Title)
	}
	return sr
}

func (sr *Search) Title() string { return "search" }

func (sr *Search) OwnsKey(k string) bool {
	return k == "space" || k == "backspace" || len([]rune(k)) == 1
}

func (sr *Search) results() []*catalog.Problem {
	problems := sr.s.App.Catalog.Problems()
	if strings.TrimSpace(sr.query) == "" {
		return problems[:min(searchLimit, len(problems))]
	}
	matches := fuzzy.Find(sr.query, sr.hay)
	var out []*catalog.Problem
	for _, m := range matches[:min(searchLimit, len(matches))] {
		out = append(out, problems[m.Index])
	}
	return out
}

func (sr *Search) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return sr, nil
	}
	switch k.String() {
	case "esc":
		return sr, pop
	case "enter":
		if res := sr.results(); sr.cursor < len(res) {
			return sr, jump(NewFocus(sr.s, res[sr.cursor], progress.Practice))
		}
	case "down", "ctrl+n":
		sr.cursor = min(sr.cursor+1, max(len(sr.results())-1, 0))
	case "up", "ctrl+p":
		sr.cursor = max(sr.cursor-1, 0)
	case "backspace":
		if r := []rune(sr.query); len(r) > 0 {
			sr.query = string(r[:len(r)-1])
		}
		sr.cursor = 0
	case "space":
		sr.query += " "
		sr.cursor = 0
	default:
		if k.Text != "" {
			sr.query += k.Text
			sr.cursor = 0
		}
	}
	return sr, nil
}

func (sr *Search) Keys() []ui.Key {
	return []ui.Key{{Key: "↑/↓", Label: "move"}, {Key: "enter", Label: "open"}, {Key: "esc", Label: "back"}}
}

func (sr *Search) View(w, h int) string {
	th := sr.s.Theme
	states := sr.s.States()
	cardW := w - 4
	inner := cardW - 4
	body := []string{th.Accent.Render("/ ") + sr.query + th.Muted.Render("█"), ""}
	res := sr.results()
	if len(res) == 0 {
		body = append(body, th.Muted.Render(fmt.Sprintf("no matches for %q", sr.query)))
	}
	for i, p := range res {
		where := " " + th.Muted.Render(ui.Truncate(strings.ToLower(p.Technique.Module.Title+" · "+p.Technique.Title), 28)) + " " + difficultyBadge(th, p.Difficulty)
		title := ui.Pad(p.Title, max(inner-4-lipgloss.Width(where), 6))
		marker := "  "
		if i == sr.cursor {
			marker, title = th.Accent.Render("▸ "), th.Selected.Render(title)
		}
		body = append(body, marker+glyph(th, statusOf(states, p.ID).Status)+" "+title+where)
	}
	body = padLines(body, max(h-3, 1))
	return "\n" + strings.Join(indent(ui.Card(th, "search", strings.Join(body[:max(h-3, 1)], "\n"), cardW, true), 2), "\n")
}
