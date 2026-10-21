package tui

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
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
	m = send(m, key("l"))
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
	view := plain(send(mapModel(t, 80), key("l")))
	assertFits(t, view, 80, 24)
	assertGolden(t, "map", view)
}

func TestMapWideShowsColumns(t *testing.T) {
	view := plain(send(mapModel(t, 120), key("l")))
	if !strings.Contains(view, "Alpha") || !strings.Contains(view, "One") || !strings.Contains(view, "P One") {
		t.Fatalf("wide map should show three columns:\n%s", view)
	}
	assertFits(t, view, 120, 24)
}

func TestNotesRendersHeading(t *testing.T) {
	m := send(mapModel(t, 80), key("n"))
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
	view := plain(send(mapModel(t, 120), key("l")))
	for _, l := range strings.Split(view, "\n") {
		if strings.Count(l, "╭─") == 3 && strings.Contains(l, "modules") && strings.Contains(l, "alpha") {
			return
		}
	}
	t.Fatalf("wide map should show three titled cards:\n%s", view)
}

func TestMapNarrowBreadcrumb(t *testing.T) {
	view := plain(send(mapModel(t, 80), key("l")))
	if !strings.Contains(view, "╭─ map › alpha") {
		t.Fatalf("narrow map should title its card with a breadcrumb:\n%s", view)
	}
}

func TestNotesCardShowsProgress(t *testing.T) {
	view := plain(send(mapModel(t, 80), key("n")))
	if !strings.Contains(view, "╭─ Alpha One · 100%") {
		t.Fatalf("notes should sit in a card with a scroll percentage:\n%s", view)
	}
}

func TestMapGoldenWide(t *testing.T) {
	assertGolden(t, "map_wide", plain(send(mapModel(t, 120), key("l"))))
}

func guideMapModel(t *testing.T, width int) tea.Model {
	t.Helper()
	a := newTestApp(t)
	dir := t.TempDir()
	for i, title := range []string{"How to Prepare", "Interview Python"} {
		path := filepath.Join(dir, fmt.Sprintf("0%d_note.md", i+1))
		if err := os.WriteFile(path, []byte("# "+title+"\n\nBody of "+title+".\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		a.Catalog.Guide = append(a.Catalog.Guide, catalog.GuideNote{Title: title, Path: path})
	}
	s := newTestShared(t, a, &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: width, Height: 24})
	return send(m, key("m"))
}

func TestMapGuideIsFirstRowWithoutMeter(t *testing.T) {
	view := plain(guideMapModel(t, 80))
	var rows []string
	for _, l := range strings.Split(view, "\n") {
		if strings.Contains(l, "Start here") || strings.Contains(l, "Alpha") {
			rows = append(rows, l)
		}
	}
	if len(rows) != 2 || !strings.Contains(rows[0], "Start here") {
		t.Fatalf("Start here should be the first map row:\n%s", view)
	}
	if strings.Contains(rows[0], "%") || !strings.Contains(rows[0], "2 notes") {
		t.Fatalf("Start here should count notes instead of showing a meter: %q", rows[0])
	}
}

func TestMapGuideOpensNotes(t *testing.T) {
	m := send(guideMapModel(t, 80), key("right"))
	if !strings.Contains(plain(m), "Interview Python") {
		t.Fatalf("drilling into Start here should list its notes:\n%s", plain(m))
	}
	m = send(m, key("down"), key("enter"))
	n, ok := m.(Model).top().(*Notes)
	if !ok || !strings.HasSuffix(n.path, "02_note.md") {
		t.Fatalf("enter on a guide note should open it, top is %T", m.(Model).top())
	}
	m = send(m, key("esc"), key("left"), key("down"), key("right"))
	if !strings.Contains(plain(m), "One") {
		t.Fatalf("the first module should follow Start here:\n%s", plain(m))
	}
}

func TestMapGuideNotesKey(t *testing.T) {
	m := send(guideMapModel(t, 80), key("n"))
	if n, ok := m.(Model).top().(*Notes); !ok || !strings.HasSuffix(n.path, "01_note.md") {
		t.Fatalf("n on Start here should open its first note, top is %T", m.(Model).top())
	}
}

func TestMapGuideWide(t *testing.T) {
	view := plain(send(guideMapModel(t, 120), key("right")))
	if !strings.Contains(view, "╭─ start here") || !strings.Contains(view, "How to Prepare") {
		t.Fatalf("wide map should show the guide notes in the second card:\n%s", view)
	}
	assertFits(t, view, 120, 24)
}

func TestMapGuidePreviewsSelectedNote(t *testing.T) {
	view := plain(send(guideMapModel(t, 120), key("right"), key("down")))
	if !strings.Contains(view, "Body of Interview Python.") || strings.Contains(view, "Body of How to Prepare.") {
		t.Fatalf("the third card should preview the selected guide note:\n%s", view)
	}
}

func TestMapHidesPlaylistOnlyProblems(t *testing.T) {
	for _, width := range []int{80, 120} {
		view := plain(mapModel(t, width))
		if strings.Contains(view, "Problem Bank") {
			t.Fatalf("width %d: playlist-only problems must not appear on the map:\n%s", width, view)
		}
	}
}

