package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
)

func playlistModel(t *testing.T, events ...progress.Event) (tea.Model, *Shared) {
	t.Helper()
	s := newTestShared(t, newTestApp(t, events...), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("p"))
	return m, s
}

func TestPlaylistProgressCounts(t *testing.T) {
	m, _ := playlistModel(t)
	view := plain(m)
	if !strings.Contains(view, "Meta") || !strings.Contains(view, "0/2") || !strings.Contains(view, "1 ext") {
		t.Fatalf("view:\n%s", view)
	}
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	m, _ = playlistModel(t, events...)
	if !strings.Contains(plain(m), "1/2") {
		t.Fatalf("mastered two-sum should count:\n%s", plain(m))
	}
}

func TestPlaylistDetailOpensFocus(t *testing.T) {
	m, _ := playlistModel(t)
	m = send(m, key("enter"))
	if !strings.Contains(plain(m), "Two Sum") || !strings.Contains(plain(m), "LRU Cache") {
		t.Fatalf("detail view:\n%s", plain(m))
	}
	_, cmd := m.Update(key("enter"))
	if msg, ok := cmd().(PushMsg); !ok {
		t.Fatal("enter on two-sum should push focus")
	} else if f, ok := msg.Screen.(*Focus); !ok || f.p.ID != "two-sum" {
		t.Fatalf("pushed %T", msg.Screen)
	}
}

func TestExternalEntryOpensURL(t *testing.T) {
	m, s := playlistModel(t)
	var opened string
	s.Open = func(url string) error { opened = url; return nil }
	send(m, key("enter"), key("j"), key("enter"))
	if opened != "https://leetcode.com/problems/lru-cache/" {
		t.Fatalf("opened %q", opened)
	}
}

func TestPlaylistsSelectedCard(t *testing.T) {
	m, _ := playlistModel(t)
	for _, l := range strings.Split(plain(m), "\n") {
		if strings.Contains(l, "│ ▸ Meta") {
			return
		}
	}
	t.Fatalf("selected playlist should be a card row:\n%s", plain(m))
}

func TestPlaylistDetailCard(t *testing.T) {
	m, _ := playlistModel(t)
	if view := plain(send(m, key("enter"))); !strings.Contains(view, "╭─ Meta") || !strings.Contains(view, "speed") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestPlaylistsGolden(t *testing.T) {
	m, _ := playlistModel(t)
	assertGolden(t, "playlists", plain(m))
}

func TestPlaylistBarsAlign(t *testing.T) {
	m, s := playlistModel(t)
	two, _ := s.App.Catalog.Problem("two-sum")
	s.App.Catalog.Playlists = append(s.App.Catalog.Playlists,
		&catalog.Playlist{ID: "x", Title: "Very Long Company Name", Entries: []catalog.PlaylistEntry{{Title: "Two Sum", Problem: two}}})
	cols := map[int]bool{}
	for _, l := range strings.Split(plain(send(m, tea.WindowSizeMsg{Width: 80, Height: 24})), "\n") {
		if i := strings.Index(l, "░"); i >= 0 {
			cols[len([]rune(l[:i]))] = true
		}
	}
	if len(cols) != 1 {
		t.Fatalf("every playlist bar should start in the same column, got %v", cols)
	}
}
