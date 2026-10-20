package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/runner"
)

func lastLine(view string) string {
	ls := strings.Split(view, "\n")
	return ls[len(ls)-1]
}

func TestFrameHasTabBarAndKeyBar(t *testing.T) {
	view := plain(homeModel(t))
	ls := strings.Split(view, "\n")
	if !strings.Contains(ls[0], "myleet") || !strings.Contains(ls[0], "today") || !strings.Contains(ls[0], "stats") {
		t.Fatalf("tab bar missing:\n%s", view)
	}
	if len(ls) != 24 || !strings.Contains(ls[23], "? more") {
		t.Fatalf("key bar missing or frame not full height (%d lines):\n%s", len(ls), view)
	}
}

func TestNumberKeysSwitchTabs(t *testing.T) {
	m := homeModel(t)
	m = send(m, key("2"))
	if _, ok := m.(Model).top().(*Map); !ok || len(m.(Model).stack) != 1 {
		t.Fatalf("2 should switch to the map tab, top=%T stack=%d", m.(Model).top(), len(m.(Model).stack))
	}
	m = send(m, key("5"))
	if _, ok := m.(Model).top().(*Stats); !ok {
		t.Fatalf("5 should switch to stats, top=%T", m.(Model).top())
	}
	m = send(m, key("tab"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatalf("tab from the last tab wraps to today, top=%T", m.(Model).top())
	}
	if !strings.Contains(strings.Split(plain(send(m, key("3"))), "\n")[0], "interview") {
		t.Fatal("tab bar should still render")
	}
}

func TestDigitsInFocusDoNotSwitchTabs(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	m = send(m, key("2"))
	if _, ok := m.(Model).top().(*Focus); !ok {
		t.Fatalf("digits belong to the focus checklist, top=%T", m.(Model).top())
	}
}

func TestEscOnRootTabReturnsToday(t *testing.T) {
	m := send(homeModel(t), key("5"), key("esc"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatalf("esc on a tab returns to today, top=%T", m.(Model).top())
	}
	_, cmd := m.Update(key("esc"))
	if cmd != nil {
		if _, quit := cmd().(tea.QuitMsg); quit {
			t.Fatal("esc on today must not quit")
		}
	}
}

func TestToastExpires(t *testing.T) {
	m := homeModel(t)
	mm := m.(Model)
	mm.s.Toast("hello there")
	if !strings.Contains(lastLine(plain(mm)), "hello there") {
		t.Fatalf("toast missing:\n%s", plain(mm))
	}
	next, _ := mm.Update(toastExpiredMsg{id: mm.s.toastID})
	if strings.Contains(plain(next), "hello there") {
		t.Fatal("toast should expire")
	}
}

func TestStickyStatusAndToast(t *testing.T) {
	m := homeModel(t).(Model)
	m.s.Status = "could not save progress: disk full"
	m.s.Toast("hi")
	ls := strings.Split(plain(m), "\n")
	if !strings.Contains(ls[len(ls)-2], "could not save progress") || !strings.Contains(ls[len(ls)-1], "hi") {
		t.Fatalf("status above key bar, toast in key bar:\n%s", plain(m))
	}
}

func TestHelpIsModal(t *testing.T) {
	view := plain(send(homeModel(t), key("?")))
	if !strings.Contains(view, "╭─ keys") {
		t.Fatalf("help should be a modal card:\n%s", view)
	}
}

func TestMapNoNotesIsToast(t *testing.T) {
	m := send(homeModel(t), key("2"), key("n"))
	if !strings.Contains(ansi.Strip(lastLine(plain(m))), "no notes") {
		t.Fatalf("missing-notes message should be a toast:\n%s", plain(m))
	}
}

func TestKeyBarShowsArrows(t *testing.T) {
	bars := map[string]tea.Model{
		"today":     homeModel(t),
		"map":       send(homeModel(t), key("2"), key("l")),
		"playlists": send(homeModel(t), key("4"), key("enter")),
		"notes":     send(homeModel(t), key("2"), key("j"), key("n")),
	}
	for name, m := range bars {
		bar := lastLine(plain(m))
		if strings.Contains(bar, "j/k") || strings.Contains(bar, "h back") {
			t.Errorf("%s key bar should show arrows, got %q", name, bar)
		}
	}
}

func TestPlaylistsArrowNavigation(t *testing.T) {
	m := send(homeModel(t), key("4"), key("right"))
	if pl := m.(Model).top().(*Playlists); pl.open == nil {
		t.Fatal("→ should open the playlist")
	}
	if m = send(m, key("left")); m.(Model).top().(*Playlists).open != nil {
		t.Fatal("← should go back to the list")
	}
}

func TestCardsStretchFullWidth(t *testing.T) {
	const w = 180
	screens := map[string]tea.Model{
		"today":     homeModel(t),
		"interview": send(homeModel(t), key("3")),
		"playlists": send(homeModel(t), key("4")),
		"stats":     statsWithHistory(t, w),
		"search":    send(homeModel(t), key("/")),
	}
	for name, m := range screens {
		m = send(m, tea.WindowSizeMsg{Width: w, Height: 40})
		found := false
		for _, l := range strings.Split(plain(m), "\n") {
			if i := strings.Index(l, "╭"); i >= 0 {
				found = true
				if got := len([]rune(strings.TrimRight(l, " "))); got != w-2 {
					t.Errorf("%s: card ends at column %d, want %d (full width)", name, got, w-2)
				}
				break
			}
		}
		if !found {
			t.Errorf("%s: no card found", name)
		}
	}
}

func TestHeatmapGrowsWithWidth(t *testing.T) {
	narrow := strings.Count(plain(statsWithHistory(t, 80)), "·")
	wide := strings.Count(plain(statsWithHistory(t, 160)), "·")
	if wide <= narrow {
		t.Fatalf("heatmap should show more weeks on a wider terminal (%d vs %d cells)", wide, narrow)
	}
}
