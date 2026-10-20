package tui

import (
	"fmt"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

type Playlists struct {
	s                     *Shared
	open                  *catalog.Playlist
	cursor, entry, offset int
}

func NewPlaylists(s *Shared) Screen { return &Playlists{s: s} }

func (pl *Playlists) Tab() int { return 3 }

func (pl *Playlists) Title() string {
	if pl.open != nil {
		return pl.open.Title
	}
	return "playlists"
}

func (pl *Playlists) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return pl, nil
	}
	lists := pl.s.App.Catalog.Playlists
	cur, n := &pl.cursor, len(lists)
	if pl.open != nil {
		cur, n = &pl.entry, len(pl.open.Entries)
	}
	switch k.String() {
	case "j", "down":
		*cur = min(*cur+1, max(n-1, 0))
	case "k", "up":
		*cur = max(*cur-1, 0)
	case "esc", "h", "left":
		if pl.open == nil {
			if k.String() == "esc" {
				return pl, pop
			}
			return pl, nil
		}
		pl.open, pl.offset = nil, 0
	case "enter", "l", "right":
		if pl.open == nil {
			if pl.cursor < len(lists) {
				pl.open, pl.entry, pl.offset = lists[pl.cursor], 0, 0
			}
			return pl, nil
		}
		if pl.entry >= len(pl.open.Entries) {
			return pl, nil
		}
		e := pl.open.Entries[pl.entry]
		if e.Problem != nil {
			return pl, push(NewFocus(pl.s, e.Problem, progress.Practice))
		}
		if err := pl.s.Open(e.URL); err != nil {
			pl.s.Toast(err.Error())
		}
	}
	return pl, nil
}

func playlistCounts(p *catalog.Playlist, states map[string]schedule.State) (mastered, trackable, external int) {
	for _, e := range p.Entries {
		if e.Problem == nil {
			external++
			continue
		}
		trackable++
		if statusOf(states, e.Problem.ID).Status == schedule.Mastered {
			mastered++
		}
	}
	return
}

func (pl *Playlists) Keys() []ui.Key {
	if pl.open != nil {
		return []ui.Key{{Key: "enter", Label: "open"}, {Key: "←", Label: "back"}}
	}
	return []ui.Key{{Key: "enter", Label: "open"}, {Key: "↑/↓", Label: "move"}}
}

func (pl *Playlists) View(w, h int) string {
	th := pl.s.Theme
	states := pl.s.States()
	cardW := min(w-4, 96)
	inner := cardW - 6
	var rows []string
	cursor := pl.cursor
	title := "playlists"
	if pl.open == nil {
		for _, p := range pl.s.App.Catalog.Playlists {
			m, t, ext := playlistCounts(p, states)
			extCol := strings.Repeat(" ", 9)
			if ext > 0 {
				extCol = fmt.Sprintf(" · %2d ext", ext)
			}
			meta := " " + ui.Bar(th, frac(m, t), 12, ui.TonePass) + th.Muted.Render(fmt.Sprintf(" %3d/%-3d", m, t)+extCol)
			rows = append(rows, ui.Pad(p.Title, max(inner-lipgloss.Width(meta), 4))+meta)
		}
	} else {
		cursor, title = pl.entry, pl.open.Title
		if pl.open.Focus != "" {
			title += " · " + pl.open.Focus
		}
		for i, e := range pl.open.Entries {
			num := th.Muted.Render(fmt.Sprintf("%2d ", i+1))
			if e.Problem == nil {
				rows = append(rows, num+th.Muted.Render(ui.Pad(e.Title, max(inner-6, 4))+" ↗"))
				continue
			}
			badge := " " + difficultyBadge(th, e.Problem.Difficulty)
			rows = append(rows, num+glyph(th, statusOf(states, e.Problem.ID).Status)+" "+ui.Pad(e.Problem.Title, max(inner-5-lipgloss.Width(badge), 4))+badge)
		}
	}
	visible := max(h-3, 1)
	pl.offset = scrollWindow(cursor, pl.offset, visible)
	var body []string
	for i := pl.offset; i < len(rows) && i < pl.offset+visible; i++ {
		marker := "  "
		if i == cursor {
			marker = th.Accent.Render("▸ ")
		}
		body = append(body, marker+rows[i])
	}
	return "\n" + strings.Join(indent(ui.Card(th, title, strings.Join(padLines(body, visible), "\n"), cardW, true), 2), "\n")
}
