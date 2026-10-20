package tui

import (
	"path/filepath"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
)

func searchModel(t *testing.T, query string) (tea.Model, *Search) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("/"))
	for _, r := range query {
		m = send(m, key(string(r)))
	}
	return m, m.(Model).top().(*Search)
}

func TestSearchFindsByTitle(t *testing.T) {
	_, s := searchModel(t, "two sum")
	if res := s.results(); len(res) == 0 || res[0].ID != "two-sum" {
		t.Fatalf("results = %v", res)
	}
}

func TestSearchByTechnique(t *testing.T) {
	_, s := searchModel(t, "one")
	res := s.results()
	if len(res) < 2 || !((res[0].ID == "p-one" && res[1].ID == "p-two") || (res[0].ID == "p-two" && res[1].ID == "p-one")) {
		t.Fatalf("results = %v", ids(res))
	}
}

func TestSearchTypingQDoesNotQuit(t *testing.T) {
	m, s := searchModel(t, "q?/")
	if s.query != "q?/" {
		t.Fatalf("query = %q", s.query)
	}
	if _, ok := m.(Model).top().(*Search); !ok {
		t.Fatal("search should still be open")
	}
}

func TestSearchEnterOpensFocus(t *testing.T) {
	m, _ := searchModel(t, "two sum")
	_, cmd := m.Update(key("enter"))
	msg, ok := cmd().(JumpMsg)
	if !ok {
		t.Fatal("enter should jump from search to focus")
	}
	if f, ok := msg.Screen.(*Focus); !ok || f.p.ID != "two-sum" {
		t.Fatalf("got %T", msg.Screen)
	}
}

func TestSearchBackspace(t *testing.T) {
	m, s := searchModel(t, "ab")
	send(m, tea.KeyPressMsg{Code: tea.KeyBackspace})
	if s.query != "a" {
		t.Fatalf("query = %q", s.query)
	}
}

func TestSearchRealCatalog(t *testing.T) {
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	c, err := catalog.Load(root)
	if err != nil {
		t.Skip("real curriculum unavailable")
	}
	a := newTestApp(t)
	a.Catalog = c
	s := newTestShared(t, a, &fakeRunner{})
	sr := NewSearch(s).(*Search)
	sr.query = "koko"
	if res := sr.results(); len(res) == 0 || res[0].ID != "koko-eating-bananas" {
		t.Fatalf("koko -> %v", ids(res))
	}
	sr.query = "monotonic"
	for _, p := range sr.results()[:3] {
		if p.Technique.ID != "monotonic_stack" {
			t.Fatalf("monotonic -> %s in %s", p.ID, p.Technique.ID)
		}
	}
}

func TestSearchIsCard(t *testing.T) {
	m, _ := searchModel(t, "two")
	if view := plain(m); !strings.Contains(view, "╭─ search") || !strings.Contains(view, "/ two") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSearchNoMatches(t *testing.T) {
	m, _ := searchModel(t, "zzzz")
	if view := plain(m); !strings.Contains(view, `no matches for "zzzz"`) {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSearchGolden(t *testing.T) {
	m, _ := searchModel(t, "p")
	assertGolden(t, "search", plain(m))
}
