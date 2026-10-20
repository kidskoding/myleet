package tui

import (
	"fmt"
	"slices"
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
	filter                listFilter
}

func NewPlaylists(s *Shared) Screen { return &Playlists{s: s} }

func (pl *Playlists) Tab() int { return 3 }

func (pl *Playlists) Title() string {
	if pl.open != nil {
		return pl.open.Title
	}
	return "playlists"
}

func (pl *Playlists) OwnsKey(k string) bool { return pl.filter.owns(k) }

func (pl *Playlists) StartFilter() bool {
	pl.filter.start()
	return true
}

func (pl *Playlists) labels() []string {
	var out []string
	if pl.open == nil {
		for _, p := range pl.s.App.Catalog.Playlists {
			out = append(out, p.Title)
		}
		return out
	}
	for _, e := range pl.open.Entries {
		if e.Problem != nil {
			out = append(out, e.Problem.Title)
		} else {
			out = append(out, e.Title)
		}
	}
	return out
}

func (pl *Playlists) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, ok := msg.(tea.KeyPressMsg)
	if !ok {
		return pl, nil
	}
	lists := pl.s.App.Catalog.Playlists
	cur := &pl.cursor
	if pl.open != nil {
		cur = &pl.entry
	}
	if pl.filter.edit(k) {
		*cur = settle(pl.filter.visible(pl.labels()), *cur)
		pl.offset = 0
		return pl, nil
	}
	vis := pl.filter.visible(pl.labels())
	switch k.String() {
	case "j", "down":
		*cur = step(vis, *cur, 1)
	case "k", "up":
		*cur = step(vis, *cur, -1)
	case "esc", "h", "left":
		pl.filter.stop()
		if pl.open == nil {
			if k.String() == "esc" {
				return pl, pop
			}
			return pl, nil
		}
		pl.open, pl.offset = nil, 0
	case "enter", "l", "right":
		if len(vis) == 0 {
			return pl, nil
		}
		if pl.open == nil {
			if pl.cursor < len(lists) {
				pl.filter.stop()
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
	if pl.filter.on {
		return []ui.Key{{Key: "↑/↓", Label: "move"}, {Key: "enter", Label: "open"}, {Key: "esc", Label: "clear"}}
	}
	if pl.open != nil {
		return []ui.Key{{Key: "enter", Label: "open"}, {Key: "←", Label: "back"}, {Key: "/", Label: "filter"}}
	}
	return []ui.Key{{Key: "enter", Label: "open"}, {Key: "↑/↓", Label: "move"}, {Key: "/", Label: "filter"}}
}

func (pl *Playlists) View(w, h int) string {
	th := pl.s.Theme
	states := pl.s.States()
	cardW := w - 4
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
	var body []string
	if pl.filter.on {
		body = append(body, pl.filter.line(th))
		visible = max(visible-1, 1)
	}
	vis := pl.filter.visible(pl.labels())
	if len(vis) == 0 {
		body = append(body, th.Muted.Render("no matches"))
	}
	pl.offset = scrollWindow(max(slices.Index(vis, cursor), 0), pl.offset, visible)
	for _, i := range vis[min(pl.offset, len(vis)):min(pl.offset+visible, len(vis))] {
		marker := "  "
		if i == cursor {
			marker = th.Accent.Render("▸ ")
		}
		body = append(body, marker+rows[i])
	}
	return "\n" + strings.Join(indent(ui.Card(th, title, strings.Join(padLines(body, max(h-3, 1)), "\n"), cardW, true), 2), "\n")
}
