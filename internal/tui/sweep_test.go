package tui

import (
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/runner"
)

func TestAllScreensFitAllSizes(t *testing.T) {
	screens := map[string]func(t *testing.T) tea.Model{
		"today":     func(t *testing.T) tea.Model { return homeModel(t) },
		"map":       func(t *testing.T) tea.Model { return send(homeModel(t), key("2"), key("l")) },
		"interview": func(t *testing.T) tea.Model { return send(homeModel(t), key("3")) },
		"playlists": func(t *testing.T) tea.Model { return send(homeModel(t), key("4")) },
		"stats":     func(t *testing.T) tea.Model { return send(homeModel(t), key("5")) },
		"search":    func(t *testing.T) tea.Model { return send(homeModel(t), key("/")) },
		"notes":     func(t *testing.T) tea.Model { return send(homeModel(t), key("2"), key("n")) },
		"focus": func(t *testing.T) tea.Model {
			m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
			return m
		},
		"round": func(t *testing.T) tea.Model {
			s := newTestShared(t, newTestApp(t), &fakeRunner{results: []runner.Result{red}})
			m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("3"))
			m.(Model).top().(*Interview).pick = func(int) []*catalog.Problem {
				p, _ := s.App.Catalog.Problem("p-one")
				return []*catalog.Problem{p}
			}
			return send(m, key("enter"))
		},
	}
	for name, build := range screens {
		m := build(t)
		for w := 60; w <= 160; w++ {
			for h := 20; h <= 40; h += 5 {
				m = send(m, tea.WindowSizeMsg{Width: w, Height: h})
				// Check the screen body before the frame's fit() truncates it, or overflow
				// would be hidden behind a cut border.
				body := plainString(m.(Model).top().View(w, h-3))
				assertFitsNamed(t, name, body, w, h-3)
				assertFitsNamed(t, name, plain(m), w, h)
			}
		}
	}
}

func assertFitsNamed(t *testing.T, name, view string, w, h int) {
	t.Helper()
	ok := t.Run("", func(t *testing.T) { assertFits(t, view, w, h) })
	if !ok {
		t.Fatalf("%s overflowed at %dx%d", name, w, h)
	}
}
