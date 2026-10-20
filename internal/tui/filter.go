package tui

import (
	"slices"

	tea "charm.land/bubbletea/v2"
	"github.com/sahilm/fuzzy"

	"github.com/kidskoding/myleet/internal/theme"
)

// listFilter narrows the list a screen shows while the user types after pressing /.
// Cursors stay indexes into the full list; the filter only decides which rows show.
type listFilter struct {
	on    bool
	query string
}

func (f *listFilter) start() { f.on, f.query = true, "" }

func (f *listFilter) stop() { f.on, f.query = false, "" }

// owns reports the keys that edit the query, so typing q or a digit never reaches the frame.
func (f *listFilter) owns(k string) bool {
	return f.on && (k == "esc" || k == "space" || k == "backspace" || len([]rune(k)) == 1)
}

// edit applies a query-editing key and reports whether it used it.
func (f *listFilter) edit(k tea.KeyPressMsg) bool {
	if !f.on {
		return false
	}
	switch k.String() {
	case "esc":
		f.stop()
	case "backspace":
		if r := []rune(f.query); len(r) > 0 {
			f.query = string(r[:len(r)-1])
		}
	case "space":
		f.query += " "
	default:
		if k.Text == "" {
			return false
		}
		f.query += k.Text
	}
	return true
}

// visible returns the indexes of labels to show, best match first while a query is typed.
func (f *listFilter) visible(labels []string) []int {
	if !f.on || f.query == "" {
		out := make([]int, len(labels))
		for i := range out {
			out[i] = i
		}
		return out
	}
	var out []int
	for _, m := range fuzzy.Find(f.query, labels) {
		out = append(out, m.Index)
	}
	return out
}

// settle keeps cur on a visible row, falling back to the first match.
func settle(vis []int, cur int) int {
	if len(vis) == 0 || slices.Contains(vis, cur) {
		return cur
	}
	return vis[0]
}

// step moves cur by d through the visible rows.
func step(vis []int, cur, d int) int {
	if len(vis) == 0 {
		return cur
	}
	pos := max(slices.Index(vis, cur), 0)
	return vis[min(max(pos+d, 0), len(vis)-1)]
}

func (f *listFilter) line(th theme.Theme) string {
	return th.Accent.Render("/ ") + f.query + th.Muted.Render("█")
}
