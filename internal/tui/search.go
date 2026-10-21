package tui

import (
	"cmp"
	"fmt"
	"slices"
	"strconv"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/sahilm/fuzzy"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/session"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

const (
	searchMax   = 200
	recentLimit = 30
)

// searchHit is one searchable thing; exactly one of problem, playlist, note or module is its target.
type searchHit struct {
	label, hay string
	problem    *catalog.Problem
	playlist   *catalog.Playlist
	module     *catalog.Module
	technique  *catalog.Technique
	note       string
	noteWhere  string
	matched    []int
}

func (h searchHit) kind() string {
	switch {
	case h.problem != nil:
		return "problem"
	case h.playlist != nil:
		return "company"
	case h.note != "":
		return "note"
	}
	return "topic"
}

type Search struct {
	s      *Shared
	query  string
	cursor int
	offset int
	index  []searchHit
	hays   []string
	cached string
	hits   []searchHit
	fresh  bool
}

func NewSearch(s *Shared) Screen {
	sr := &Search{s: s}
	c := s.App.Catalog
	for _, n := range c.Guide {
		sr.add(searchHit{label: n.Title, hay: n.Title + " start here guide", note: n.Path, noteWhere: "start here"})
	}
	for _, p := range c.Problems() {
		sr.add(searchHit{label: p.Title, hay: p.Title + " " + p.Technique.Title + " " + p.Technique.Module.Title, problem: p})
	}
	for _, pl := range c.Playlists {
		sr.add(searchHit{label: pl.Title, hay: pl.Title, playlist: pl})
	}
	for _, m := range c.Modules {
		if m.Bank {
			continue // playlist-only problems are searchable as problems, not as a map topic
		}
		sr.add(searchHit{label: m.Title, hay: m.Title, module: m})
		for _, t := range m.Techniques {
			sr.add(searchHit{label: t.Title, hay: t.Title + " " + m.Title, module: m, technique: t})
		}
		for _, path := range m.Notes {
			title := catalog.NoteTitle(path)
			sr.add(searchHit{label: title, hay: title + " " + m.Title, note: path, noteWhere: m.Title})
		}
	}
	return sr
}

func (sr *Search) add(h searchHit) {
	sr.index = append(sr.index, h)
	sr.hays = append(sr.hays, h.hay)
}

func (sr *Search) Title() string { return "search" }

func (sr *Search) OwnsKey(k string) bool {
	return k == "space" || k == "backspace" || len([]rune(k)) == 1
}

func (sr *Search) results() []searchHit {
	if sr.fresh && sr.cached == sr.query {
		return sr.hits
	}
	q := strings.TrimSpace(sr.query)
	switch {
	case q == "":
		sr.hits = sr.suggestions()
	case isDigits(q):
		sr.hits = sr.byNumber(q)
	default:
		sr.hits = sr.fuzzy(q)
	}
	sr.cached, sr.fresh = sr.query, true
	return sr.hits
}

// suggestions are today's queue, then recently practiced problems.
func (sr *Search) suggestions() []searchHit {
	a := sr.s.App
	states := sr.s.States()
	seen := map[string]bool{}
	var out []searchHit
	push := func(p *catalog.Problem) {
		if !seen[p.ID] {
			seen[p.ID] = true
			out = append(out, searchHit{label: p.Title, problem: p})
		}
	}
	for _, it := range session.TodayWithEvents(a.Catalog, states, sr.s.Now(), a.Config.NewPerDay, a.Events) {
		push(it.Problem)
	}
	var recent []*catalog.Problem
	for _, p := range a.Catalog.Problems() {
		if st, ok := states[p.ID]; ok && st.Status != schedule.Unseen {
			recent = append(recent, p)
		}
	}
	slices.SortStableFunc(recent, func(x, y *catalog.Problem) int {
		return states[y.ID].LastFinished.Compare(states[x.ID].LastFinished)
	})
	for _, p := range recent[:min(len(recent), recentLimit)] {
		push(p)
	}
	return out
}

func isDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return s != ""
}

func (sr *Search) byNumber(q string) []searchHit {
	var out []searchHit
	for _, h := range sr.index {
		if h.problem != nil && h.problem.LeetCode > 0 && strings.HasPrefix(strconv.Itoa(h.problem.LeetCode), q) {
			out = append(out, h)
		}
	}
	slices.SortStableFunc(out, func(x, y searchHit) int {
		return cmp.Compare(x.problem.LeetCode, y.problem.LeetCode)
	})
	return out[:min(len(out), searchMax)]
}

// fuzzy ranks exact label matches, then label prefixes, then everything else by fuzzy score.
func (sr *Search) fuzzy(q string) []searchHit {
	lower := strings.ToLower(q)
	tier := func(label string) int {
		l := strings.ToLower(label)
		switch {
		case l == lower:
			return 0
		case strings.HasPrefix(l, lower):
			return 1
		}
		return 2
	}
	type ranked struct {
		hit         searchHit
		tier, score int
	}
	var rs []ranked
	for _, m := range fuzzy.Find(q, sr.hays) {
		if !compact(sr.hays[m.Index], m.MatchedIndexes, len([]rune(q))) {
			continue
		}
		h := sr.index[m.Index]
		h.matched = nil
		for _, i := range m.MatchedIndexes {
			if i < len(h.label) {
				h.matched = append(h.matched, i)
			}
		}
		rs = append(rs, ranked{h, tier(h.label), m.Score})
	}
	slices.SortStableFunc(rs, func(x, y ranked) int {
		if x.tier != y.tier {
			return x.tier - y.tier
		}
		return y.score - x.score
	})
	out := make([]searchHit, 0, min(len(rs), searchMax))
	for _, r := range rs[:min(len(rs), searchMax)] {
		out = append(out, r.hit)
	}
	return out
}

// compact rejects matches whose letters are scattered through words. A match starts at
// a word (or with three letters in a row), and every later run of letters starts a word,
// except one run for queries of four or more letters: "strp" still finds Stripe, "lru"
// no longer finds Liberty Mutual.
func compact(hay string, idx []int, n int) bool {
	if n <= 1 {
		return true
	}
	wordStart := func(i int) bool {
		return i == 0 || strings.ContainsRune(" -(/", rune(hay[i-1]))
	}
	firstRun := 1
	for firstRun < len(idx) && idx[firstRun] == idx[firstRun-1]+1 {
		firstRun++
	}
	if !wordStart(idx[0]) && firstRun < 3 {
		return false
	}
	allowed := 0
	if n >= 4 {
		allowed = 1
	}
	for i := firstRun; i < len(idx); i++ {
		if idx[i] == idx[i-1]+1 || wordStart(idx[i]) {
			continue
		}
		if allowed == 0 {
			return false
		}
		allowed--
	}
	return true
}

func (sr *Search) open(h searchHit) tea.Cmd {
	c := sr.s.App.Catalog
	switch {
	case h.problem != nil:
		return jump(NewFocus(sr.s, h.problem, progress.Practice))
	case h.playlist != nil:
		return jump(&Playlists{s: sr.s, open: h.playlist, cursor: slices.Index(c.Playlists, h.playlist)})
	case h.note != "":
		return jump(NewNotes(sr.s, h.note))
	}
	mp := &Map{s: sr.s, mod: slices.Index(c.Modules, h.module)}
	if len(c.Guide) > 0 {
		mp.mod++
	}
	if h.technique != nil {
		mp.level, mp.tech = 1, slices.Index(h.module.Techniques, h.technique)
	}
	return jump(mp)
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
			return sr, sr.open(res[sr.cursor])
		}
	case "down", "ctrl+n":
		sr.cursor = min(sr.cursor+1, max(len(sr.results())-1, 0))
	case "up", "ctrl+p":
		sr.cursor = max(sr.cursor-1, 0)
	case "backspace":
		if r := []rune(sr.query); len(r) > 0 {
			sr.query = string(r[:len(r)-1])
		}
		sr.cursor, sr.offset = 0, 0
	case "space":
		sr.query += " "
		sr.cursor, sr.offset = 0, 0
	default:
		if k.Text != "" {
			sr.query += k.Text
			sr.cursor, sr.offset = 0, 0
		}
	}
	return sr, nil
}

func (sr *Search) Keys() []ui.Key {
	return []ui.Key{{Key: "↑/↓", Label: "move"}, {Key: "enter", Label: "open"}, {Key: "esc", Label: "back"}}
}

// highlight renders the bytes of label at idx in hl and the rest in base.
func highlight(label string, idx []int, base, hl lipgloss.Style) string {
	on := map[int]bool{}
	for _, i := range idx {
		on[i] = true
	}
	var b, run strings.Builder
	runOn := false
	flush := func() {
		if run.Len() == 0 {
			return
		}
		style := base
		if runOn {
			style = hl
		}
		b.WriteString(style.Render(run.String()))
		run.Reset()
	}
	for i, r := range label {
		if on[i] != runOn {
			flush()
			runOn = on[i]
		}
		run.WriteRune(r)
	}
	flush()
	return b.String()
}

func (sr *Search) meta(h searchHit, states map[string]schedule.State) string {
	th := sr.s.Theme
	switch {
	case h.problem != nil:
		where := strings.ToLower(h.problem.Technique.Module.Title + " · " + h.problem.Technique.Title)
		if h.problem.Technique.Module.Bank {
			where = "playlist · " + strings.ToLower(h.problem.Technique.Title)
		}
		return " " + th.Muted.Render(ui.Truncate(where, 28)) + " " + difficultyBadge(th, h.problem.Difficulty)
	case h.playlist != nil:
		m, t, _ := playlistCounts(h.playlist, states)
		return " " + th.Muted.Render(fmt.Sprintf("%d/%d mastered", m, t))
	case h.note != "":
		return " " + th.Muted.Render(strings.ToLower(h.noteWhere))
	case h.technique != nil:
		return " " + th.Muted.Render(strings.ToLower(h.module.Title)+" · "+plural(len(h.technique.Problems), "problem", "problems"))
	}
	n := 0
	for _, t := range h.module.Techniques {
		n += len(t.Problems)
	}
	return " " + th.Muted.Render("module · "+plural(n, "problem", "problems"))
}

func (sr *Search) row(h searchHit, selected bool, states map[string]schedule.State, inner int) string {
	th := sr.s.Theme
	base, hl := lipgloss.NewStyle(), th.Accent.Underline(true)
	marker := "  "
	if selected {
		marker, base, hl = th.Accent.Render("▸ "), th.Selected, th.Selected.Underline(true)
	}
	lead := "  "
	if h.problem != nil {
		lead = glyph(th, statusOf(states, h.problem.ID).Status) + " "
	}
	tag := ""
	if inner >= 60 {
		tag = th.Muted.Render(fmt.Sprintf("%-8s", h.kind()))
	}
	meta := sr.meta(h, states)
	labelW := max(inner-2-lipgloss.Width(tag)-2-lipgloss.Width(meta), 6)
	return marker + tag + lead + ui.Pad(highlight(h.label, h.matched, base, hl), labelW) + meta
}

func (sr *Search) View(w, h int) string {
	th := sr.s.Theme
	states := sr.s.States()
	cardW := w - 4
	inner := cardW - 4
	visible := max(h-5, 1)
	body := []string{th.Accent.Render("/ ") + sr.query + th.Muted.Render("█"), ""}
	res := sr.results()
	if len(res) == 0 {
		body = append(body, th.Muted.Render(fmt.Sprintf("no matches for %q", sr.query)))
	}
	sr.offset = scrollWindow(sr.cursor, sr.offset, visible)
	for i := sr.offset; i < len(res) && i < sr.offset+visible; i++ {
		body = append(body, sr.row(res[i], i == sr.cursor, states, inner))
	}
	title := "search"
	if n := len(res); n > visible {
		title = fmt.Sprintf("search · %d results", n)
	}
	body = padLines(body, max(h-3, 1))
	return "\n" + strings.Join(indent(ui.Card(th, title, strings.Join(body[:max(h-3, 1)], "\n"), cardW, true), 2), "\n")
}
