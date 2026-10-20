package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
)

func typed(m tea.Model, s string) tea.Model {
	for _, r := range s {
		m = send(m, key(string(r)))
	}
	return m
}

func TestPlaylistsFilterCompanies(t *testing.T) {
	m := typed(send(homeModel(t), key("4"), key("/")), "str")
	view := plain(m)
	if !strings.Contains(view, "/ str") || !strings.Contains(view, "Stripe") || strings.Contains(view, "Meta") {
		t.Fatalf("/ on playlists should filter companies:\n%s", view)
	}
	m = send(m, key("enter"))
	if pl := m.(Model).top().(*Playlists); pl.open == nil || pl.open.Title != "Stripe" {
		t.Fatal("enter should open the filtered company")
	}
}

func TestPlaylistFilterProblems(t *testing.T) {
	m := send(homeModel(t), key("4"), key("enter"), key("/"))
	m = typed(m, "logger")
	view := plain(m)
	if !strings.Contains(view, "Logger Rate Limiter") || strings.Contains(view, "Two Sum") {
		t.Fatalf("/ inside a playlist should filter its problems:\n%s", view)
	}
	m = send(m, key("enter"))
	if f, ok := m.(Model).top().(*Focus); !ok || f.p.ID != "logger-rate-limiter" {
		t.Fatalf("enter should open the filtered problem, top is %T", m.(Model).top())
	}
}

func TestFilterEscClearsBeforeLeaving(t *testing.T) {
	m := typed(send(homeModel(t), key("4"), key("/")), "str")
	m = send(m, key("esc"))
	pl, ok := m.(Model).top().(*Playlists)
	if !ok || pl.filter.on || !strings.Contains(plain(m), "Meta") {
		t.Fatalf("first esc should only clear the filter:\n%s", plain(m))
	}
}

func TestFilterTypingQDoesNotQuit(t *testing.T) {
	m := typed(send(homeModel(t), key("4"), key("/")), "q")
	if _, ok := m.(Model).top().(*Playlists); !ok {
		t.Fatal("typing q into a filter must not quit or leave")
	}
}

func TestFilterArrowsMoveWithinMatches(t *testing.T) {
	m := typed(send(homeModel(t), key("2"), key("/")), "a")
	m = send(m, key("down"))
	mp := m.(Model).top().(*Map)
	if title := mp.module().Title; !strings.Contains(strings.ToLower(title), "a") {
		t.Fatalf("down should stay on matching rows, landed on %q", title)
	}
}

func TestMapFilterCurrentColumn(t *testing.T) {
	m := typed(send(homeModel(t), key("2"), key("/")), "bet")
	view := plain(m)
	if !strings.Contains(view, "Beta") || strings.Contains(view, "Alpha") {
		t.Fatalf("/ on the map should filter the current column:\n%s", view)
	}
	m = send(m, key("enter"))
	mp := m.(Model).top().(*Map)
	if mp.level != 1 || mp.module().Title != "Beta" {
		t.Fatalf("enter should drill into the filtered module, level %d", mp.level)
	}
}

func TestSlashWithoutListOpensSearch(t *testing.T) {
	m := send(homeModel(t), key("5"), key("/"))
	if _, ok := m.(Model).top().(*Search); !ok {
		t.Fatal("/ on a screen without a list should open search")
	}
}

func TestCtrlKOpensSearchEverywhere(t *testing.T) {
	for _, tab := range []string{"1", "2", "4"} {
		m := send(homeModel(t), key(tab), tea.KeyPressMsg{Code: 'k', Mod: tea.ModCtrl})
		if _, ok := m.(Model).top().(*Search); !ok {
			t.Errorf("ctrl+k on tab %s should open search", tab)
		}
	}
}
