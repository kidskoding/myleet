package tui

import (
	"strings"

	"github.com/kidskoding/myleet/internal/tui/ui"
)

var globalHelp = []string{
	"↑/↓ j/k   move",
	"enter     open",
	"esc       back",
	"/         filter this list, or search everything where there is no list",
	"ctrl+k    search problems, companies, topics and notes",
	"[ ]       previous / next tab, from any screen (leaves an open problem)",
	"1-5 tab   jump to a tab from the main screens (today, map, timed, playlists, stats)",
	"?         close this help",
	"q         quit",
}

func (m Model) helpView(width, height int) string {
	th := m.s.Theme
	var lines []string
	if h, ok := m.top().(helper); ok {
		lines = append(lines, h.Help()...)
		lines = append(lines, "")
	}
	for _, l := range globalHelp {
		lines = append(lines, th.Muted.Render(l))
	}
	return ui.Modal(th, "keys · "+m.top().Title(), strings.Join(lines, "\n"), width, height)
}
