package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
)

func settingsModel(t *testing.T, events ...progress.Event) tea.Model {
	t.Helper()
	s := newTestShared(t, newTestApp(t, events...), &fakeRunner{})
	return send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("s"))
}

func TestSettingsEmptyShowsStats(t *testing.T) {
	if view := plain(settingsModel(t)); !strings.Contains(view, "No attempts yet") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSettingsGolden80x24(t *testing.T) {
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12, 18} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	events = append(events, passedEvents("p-one", 18)...)
	events = append(events, passedEvents("p-two", 19)...)
	view := plain(settingsModel(t, events...))
	if !strings.Contains(view, "2 days") || !strings.Contains(view, "1 / 4") {
		t.Fatalf("view:\n%s", view)
	}
	assertFits(t, view, 80, 24)
	assertGolden(t, "settings", view)
}

func statsWithHistory(t *testing.T, width int) tea.Model {
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12, 18} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	events = append(events, passedEvents("p-one", 18)...)
	return send(settingsModel(t, events...), tea.WindowSizeMsg{Width: width, Height: 32})
}

func TestSettingsOverviewCard(t *testing.T) {
	view := plain(statsWithHistory(t, 100))
	for _, want := range []string{"╭─ overview", "Streak", "Mastered", "Median"} {
		if !strings.Contains(view, want) {
			t.Fatalf("settings should open on the overview card, missing %q:\n%s", want, view)
		}
	}
}

func TestSettingsHeatmapCard(t *testing.T) {
	if view := plain(statsWithHistory(t, 100)); !strings.Contains(view, "╭─ last ") || !strings.Contains(view, " weeks ─") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSettingsGoldenWide(t *testing.T) {
	assertGolden(t, "settings_wide", plain(statsWithHistory(t, 120)))
}

func TestSettingsEmptyKeepsTheLayout(t *testing.T) {
	m := send(settingsModel(t), tea.WindowSizeMsg{Width: 80, Height: 40})
	view := plain(m)
	for _, want := range []string{"╭─ overview", "╭─ last ", "No attempts yet"} {
		if !strings.Contains(view, want) {
			t.Fatalf("empty settings should still show the dashboard, missing %q:\n%s", want, view)
		}
	}
	if strings.Contains(view, "╭─ progress") {
		t.Fatal("settings should not list per-module progress; the map already does that")
	}
	if view := plain(send(m, key("G"))); !strings.Contains(view, "danger zone") {
		t.Fatalf("G should scroll to the danger zone:\n%s", view)
	}
}

func TestSettingsEnterOnlyResets(t *testing.T) {
	m := send(settingsModel(t), tea.WindowSizeMsg{Width: 80, Height: 40}, key("enter"))
	if _, ok := m.(Model).top().(*Settings); !ok {
		t.Fatalf("enter on overview should stay in settings, top=%T", m.(Model).top())
	}
	if strings.Contains(plain(m), "start fresh?") {
		t.Fatal("enter on overview must not start a reset")
	}
	m = send(m, key("G"), key("enter"))
	if !strings.Contains(plain(m), "start fresh?") {
		t.Fatalf("enter on danger zone should confirm reset:\n%s", plain(m))
	}
}
