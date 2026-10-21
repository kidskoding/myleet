package tui

import (
	"path/filepath"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/session"
)

func searchModel(t *testing.T, query string) (tea.Model, *Search) {
	t.Helper()
	// Placement gate owns "/" so search tests start past the warm-up.
	s := newTestShared(t, newTestApp(t, placementSkipped(), checkpointSnoozed()), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("/"))
	for _, r := range query {
		m = send(m, key(string(r)))
	}
	return m, m.(Model).top().(*Search)
}

func problemIDs(hits []searchHit) []string {
	var out []string
	for _, h := range hits {
		if h.problem != nil {
			out = append(out, h.problem.ID)
		}
	}
	return out
}

func jumpTarget(t *testing.T, m tea.Model) Screen {
	t.Helper()
	_, cmd := m.Update(key("enter"))
	if cmd == nil {
		t.Fatal("enter did nothing")
	}
	msg, ok := cmd().(JumpMsg)
	if !ok {
		t.Fatalf("enter should jump out of search, got %T", cmd())
	}
	return msg.Screen
}

func TestSearchFindsByTitle(t *testing.T) {
	_, s := searchModel(t, "two sum")
	if res := s.results(); len(res) == 0 || res[0].problem == nil || res[0].problem.ID != "two-sum" {
		t.Fatalf("results = %v", problemIDs(res))
	}
}

func TestSearchByTechnique(t *testing.T) {
	_, s := searchModel(t, "one")
	got := problemIDs(s.results())
	if len(got) < 2 || !((got[0] == "p-one" && got[1] == "p-two") || (got[0] == "p-two" && got[1] == "p-one")) {
		t.Fatalf("results = %v", got)
	}
}

func TestSearchByLeetCodeNumber(t *testing.T) {
	_, s := searchModel(t, "359")
	if res := s.results(); len(res) == 0 || res[0].problem == nil || res[0].problem.ID != "logger-rate-limiter" {
		t.Fatalf("359 should find Logger Rate Limiter first, got %v", problemIDs(res))
	}
}

func TestSearchFindsCompanyAndOpensPlaylist(t *testing.T) {
	m, s := searchModel(t, "meta")
	if res := s.results(); len(res) == 0 || res[0].playlist == nil {
		t.Fatalf("meta should find the Meta playlist first")
	}
	pl, ok := jumpTarget(t, m).(*Playlists)
	if !ok || pl.open == nil || pl.open.Title != "Meta" {
		t.Fatalf("enter on a company should open its playlist, got %T", pl)
	}
}

func TestSearchTopicOpensMap(t *testing.T) {
	m, s := searchModel(t, "three")
	if res := s.results(); len(res) == 0 || res[0].technique == nil {
		t.Fatalf("three should find the Three technique first")
	}
	mp, ok := jumpTarget(t, m).(*Map)
	if !ok || mp.level != 1 || mp.technique() == nil || mp.technique().Title != "Three" {
		t.Fatalf("enter on a topic should open the map at it")
	}
}

func TestSearchNoteOpensNotes(t *testing.T) {
	m, s := searchModel(t, "alpha one")
	if res := s.results(); len(res) == 0 || res[0].note == "" {
		t.Fatalf("alpha one should find the Alpha One note first")
	}
	if n, ok := jumpTarget(t, m).(*Notes); !ok || !strings.HasSuffix(n.path, "01_a.md") {
		t.Fatal("enter on a note should open it")
	}
}

func TestSearchEmptyQueryShowsToday(t *testing.T) {
	_, s := searchModel(t, "")
	a := s.s.App
	today := session.Today(a.Catalog, s.s.States(), s.s.Now(), a.Config.NewPerDay)
	got := problemIDs(s.results())
	if len(today) == 0 || len(got) < len(today) {
		t.Fatalf("empty search should list today's queue, got %v", got)
	}
	for i, it := range today {
		if got[i] != it.Problem.ID {
			t.Fatalf("empty search should start with today's queue %v, got %v", it.Problem.ID, got)
		}
	}
}

func TestSearchRowsShowKind(t *testing.T) {
	m, _ := searchModel(t, "e")
	view := plain(m)
	for _, kind := range []string{"problem", "company", "topic", "note"} {
		if !strings.Contains(view, kind) {
			t.Errorf("results should label %s hits:\n%s", kind, view)
		}
	}
}

func TestHighlightMarksMatches(t *testing.T) {
	th := newTestShared(t, newTestApp(t), &fakeRunner{}).Theme
	out := highlight("Two Sum", []int{0, 4}, th.Title, th.Accent.Underline(true))
	if ansi.Strip(out) != "Two Sum" || !hasSGR(out, "4") {
		t.Fatalf("highlight should underline matched letters and keep the text: %q", out)
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
	if f, ok := jumpTarget(t, m).(*Focus); !ok || f.p.ID != "two-sum" {
		t.Fatal("enter on a problem should open it")
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
	if got := problemIDs(sr.results()); len(got) == 0 || got[0] != "koko-eating-bananas" {
		t.Fatalf("koko -> %v", got)
	}
	sr.query = "146"
	if got := problemIDs(sr.results()); len(got) == 0 || got[0] != "lru-cache" {
		t.Fatalf("146 -> %v", got)
	}
	sr.query = "strp"
	if res := sr.results(); len(res) == 0 || res[0].playlist == nil || res[0].playlist.Title != "Stripe" {
		t.Fatal("strp should find Stripe first")
	}
	sr.query = "lru"
	for _, h := range sr.results() {
		if h.label != "LRU Cache" && !strings.Contains(strings.ToLower(h.hay), "lru") {
			t.Fatalf("lru should not match scattered letters like %q", h.label)
		}
	}
	sr.query = "a"
	if rows := strings.Count(ansi.Strip(sr.View(100, 40)), "problem"); rows <= 12 {
		t.Fatalf("results should fill the screen, got %d rows", rows)
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

func TestKeyBarOffersSearchEverywhere(t *testing.T) {
	for name, tc := range map[string]struct {
		m    tea.Model
		want string
	}{
		"today":     {homeModel(t), "/ search"},
		"map":       {send(homeModel(t), key("2")), "/ filter"},
		"playlists": {send(homeModel(t), key("4")), "/ filter"},
		"stats":     {send(homeModel(t), key("5")), "/ search"},
	} {
		if bar := lastLine(plain(tc.m)); !strings.Contains(bar, tc.want) {
			t.Errorf("%s key bar should offer %q, got %q", name, tc.want, bar)
		}
	}
}

func TestSearchGolden(t *testing.T) {
	m, _ := searchModel(t, "p")
	assertGolden(t, "search", plain(m))
}
