package tui

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
)

func mapModel(t *testing.T, width int, events ...progress.Event) tea.Model {
	t.Helper()
	s := newTestShared(t, newTestApp(t, events...), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: width, Height: 24})
	return send(m, key("m"))
}

func TestMapDrillDown(t *testing.T) {
	m := mapModel(t, 80)
	mp, ok := m.(Model).top().(*Map)
	if !ok {
		t.Fatal("m should open the map")
	}
	// modules: beta (priority 1), alpha
	m = send(m, key("j"), key("l"))
	if mp.level != 1 || !strings.Contains(plain(m), "One") {
		t.Fatalf("level=%d view:\n%s", mp.level, plain(m))
	}
	m = send(m, key("enter"))
	if mp.level != 2 || !strings.Contains(plain(m), "P One") {
		t.Fatalf("level=%d view:\n%s", mp.level, plain(m))
	}
	_, cmd := m.Update(key("enter"))
	msg, ok := cmd().(PushMsg)
	if !ok {
		t.Fatal("enter on a problem should push focus")
	}
	if f, ok := msg.Screen.(*Focus); !ok || f.p.ID != "p-one" {
		t.Fatalf("pushed %T", msg.Screen)
	}
	m = send(m, key("h"), key("esc"))
	if mp.level != 0 {
		t.Fatalf("level = %d", mp.level)
	}
	m = send(m, key("esc"))
	if _, ok := m.(Model).top().(*Home); !ok {
		t.Fatal("esc at modules should return home")
	}
}

func TestMapBarsReflectStates(t *testing.T) {
	var events []progress.Event
	for _, day := range []int{1, 2, 5, 12} {
		events = append(events, passedEvents("two-sum", day)...)
	}
	view := plain(mapModel(t, 80, events...))
	if !strings.Contains(view, "██████████ 100%") {
		t.Fatalf("beta should be fully mastered:\n%s", view)
	}
	if !strings.Contains(view, "░░░░░░░░░░   0%") {
		t.Fatalf("alpha should be 0%%:\n%s", view)
	}
}

func TestMapGolden80x24(t *testing.T) {
	view := plain(send(mapModel(t, 80), key("j"), key("l")))
	assertFits(t, view, 80, 24)
	assertGolden(t, "map", view)
}

func TestMapWideShowsColumns(t *testing.T) {
	view := plain(send(mapModel(t, 120), key("j"), key("l")))
	if !strings.Contains(view, "Alpha") || !strings.Contains(view, "One") || !strings.Contains(view, "P One") {
		t.Fatalf("wide map should show three columns:\n%s", view)
	}
	assertFits(t, view, 120, 24)
}

func TestNotesRendersHeading(t *testing.T) {
	m := send(mapModel(t, 80), key("j"), key("n"))
	if _, ok := m.(Model).top().(*Notes); !ok {
		t.Fatalf("n should open notes, top is %T", m.(Model).top())
	}
	if !strings.Contains(plain(m), "Alpha One") {
		t.Fatalf("view:\n%s", plain(m))
	}
	m = send(m, key("esc"))
	if _, ok := m.(Model).top().(*Map); !ok {
		t.Fatal("esc should return to the map")
	}
}

func TestMapCardsWide(t *testing.T) {
	view := plain(send(mapModel(t, 120), key("j"), key("l")))
	for _, l := range strings.Split(view, "\n") {
		if strings.Count(l, "╭─") == 3 && strings.Contains(l, "modules") && strings.Contains(l, "alpha") {
			return
		}
	}
	t.Fatalf("wide map should show three titled cards:\n%s", view)
}

func TestMapNarrowBreadcrumb(t *testing.T) {
	view := plain(send(mapModel(t, 80), key("j"), key("l")))
	if !strings.Contains(view, "╭─ map › alpha") {
		t.Fatalf("narrow map should title its card with a breadcrumb:\n%s", view)
	}
}

func TestNotesCardShowsProgress(t *testing.T) {
	view := plain(send(mapModel(t, 80), key("j"), key("n")))
	if !strings.Contains(view, "╭─ 01_a · 100%") {
		t.Fatalf("notes should sit in a card with a scroll percentage:\n%s", view)
	}
}

func TestMapGoldenWide(t *testing.T) {
	assertGolden(t, "map_wide", plain(send(mapModel(t, 120), key("j"), key("l"))))
}
