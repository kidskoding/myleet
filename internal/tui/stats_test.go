package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
)

func statsModel(t *testing.T, events ...progress.Event) tea.Model {
	t.Helper()
	s := newTestShared(t, newTestApp(t, events...), &fakeRunner{})
	return send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("s"))
}

func TestStatsEmpty(t *testing.T) {
	if view := plain(statsModel(t)); !strings.Contains(view, "No attempts yet") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestStatsGolden80x24(t *testing.T) {
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12, 18} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	events = append(events, passedEvents("p-one", 18)...)
	events = append(events, passedEvents("p-two", 19)...)
	view := plain(statsModel(t, events...))
	if !strings.Contains(view, "2 days") || !strings.Contains(view, "1 / 4") {
		t.Fatalf("view:\n%s", view)
	}
	assertFits(t, view, 80, 24)
	assertGolden(t, "stats", view)
}

func statsWithHistory(t *testing.T, width int) tea.Model {
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12, 18} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	events = append(events, passedEvents("p-one", 18)...)
	return send(statsModel(t, events...), tea.WindowSizeMsg{Width: width, Height: 32})
}

func TestStatsTiles(t *testing.T) {
	for _, l := range strings.Split(plain(statsWithHistory(t, 100)), "\n") {
		if strings.Count(l, "╭─") == 3 && strings.Contains(l, "streak") && strings.Contains(l, "mastered") && strings.Contains(l, "median") {
			return
		}
	}
	t.Fatalf("stats should open with three tiles:\n%s", plain(statsWithHistory(t, 100)))
}

func TestStatsHeatmapCard(t *testing.T) {
	if view := plain(statsWithHistory(t, 100)); !strings.Contains(view, "╭─ last ") || !strings.Contains(view, " weeks ─") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestStatsGoldenWide(t *testing.T) {
	assertGolden(t, "stats_wide", plain(statsWithHistory(t, 120)))
}
