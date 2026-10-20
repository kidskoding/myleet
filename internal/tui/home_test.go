package tui

import (
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func passedEvents(id string, day int) []progress.Event {
	start := testNow.AddDate(0, 0, day-19)
	att := progress.NewAttemptID()
	return []progress.Event{
		{Time: start, Kind: progress.Opened, Problem: id, Attempt: att, Mode: progress.Practice},
		{Time: start.Add(5 * 60e9), Kind: progress.Passed, Problem: id, Attempt: att, Mode: progress.Practice, Data: map[string]string{"elapsed_ms": "300000"}},
	}
}

func homeModel(t *testing.T, events ...progress.Event) tea.Model {
	a := newTestApp(t, events...)
	m := New(newTestShared(t, a, &fakeRunner{}), "")
	return send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
}

func TestHomeGolden80x24(t *testing.T) {
	var events []progress.Event
	events = append(events, passedEvents("p-three", 17)...) // due 18 -> 1 day overdue
	events = append(events, passedEvents("p-two", 18)...)   // due 19 -> due today
	m := homeModel(t, events...)
	view := plain(m)
	assertFits(t, view, 80, 24)
	assertGolden(t, "home", view)
}

func TestHomeEmptyQueue(t *testing.T) {
	var events []progress.Event
	for _, id := range []string{"two-sum", "p-one", "p-two", "p-three"} {
		events = append(events, passedEvents(id, 19)...)
	}
	view := plain(homeModel(t, events...))
	if !strings.Contains(view, "all caught up") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestHomeNavigation(t *testing.T) {
	m := homeModel(t).(Model)
	if m.top().(*Home).cursor != 0 {
		t.Fatal("cursor should start at 0")
	}
	next, _ := m.Update(key("j"))
	if next.(Model).top().(*Home).cursor != 1 {
		t.Fatal("j should move down")
	}
	_, cmd := next.Update(key("enter"))
	if cmd == nil {
		t.Fatal("enter should push focus")
	}
	if _, ok := cmd().(PushMsg); !ok {
		t.Fatal("enter should emit PushMsg")
	}
}

func TestResizeNarrow(t *testing.T) {
	m := send(homeModel(t), tea.WindowSizeMsg{Width: 40, Height: 10})
	assertFits(t, plain(m), 40, 10)
}

func TestHelpToggle(t *testing.T) {
	m := send(homeModel(t), key("?"))
	if !strings.Contains(plain(m), "keys") {
		t.Fatalf("help not shown:\n%s", plain(m))
	}
	m = send(m, key("?"))
	if strings.Contains(plain(m), "keys") {
		t.Fatal("help should close")
	}
}

func TestGreetingByHour(t *testing.T) {
	for hour, want := range map[int]string{9: "Good morning", 14: "Good afternoon", 22: "Good evening", 3: "Good evening"} {
		a := newTestApp(t)
		now := time.Date(2026, 10, 19, hour, 0, 0, 0, tu.Chicago)
		a.Now = func() time.Time { return now }
		m := send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 80, Height: 24})
		if view := plain(m); !strings.Contains(view, want) || !strings.Contains(view, "3 new today") {
			t.Fatalf("%d:00 should greet %q:\n%s", hour, want, view)
		}
	}
}

func TestHomeSelectedRowIsCard(t *testing.T) {
	for _, l := range strings.Split(plain(homeModel(t)), "\n") {
		if strings.Contains(l, "▸") && strings.Contains(l, "│") {
			return
		}
	}
	t.Fatalf("selected row should sit inside a card:\n%s", plain(homeModel(t)))
}

func TestHomeShowsStreakAndMastery(t *testing.T) {
	view := plain(homeModel(t, passedEvents("p-one", 18)...))
	if !strings.Contains(view, "day streak") || !strings.Contains(view, "mastery") || !strings.Contains(view, "0/4") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestHomeGolden120x32(t *testing.T) {
	var events []progress.Event
	events = append(events, passedEvents("p-three", 17)...)
	events = append(events, passedEvents("p-two", 18)...)
	m := send(homeModel(t, events...), tea.WindowSizeMsg{Width: 120, Height: 32})
	view := plain(m)
	assertFits(t, view, 120, 32)
	assertGolden(t, "home_wide", view)
}

func TestHomeShowsWhyNewProblemsWerePicked(t *testing.T) {
	view := plain(send(homeModel(t), tea.WindowSizeMsg{Width: 120, Height: 30}))
	if !strings.Contains(view, "new topic · one") {
		t.Fatalf("new problems should say why they were picked:\n%s", view)
	}
	a := newTestApp(t)
	for i := 0; i < 2; i++ {
		att := progress.NewAttemptID()
		at := testNow.AddDate(0, 0, -3+i)
		a.Record(progress.Event{Time: at, Kind: progress.Opened, Problem: "p-one", Attempt: att, Mode: progress.Practice})
		a.Record(progress.Event{Time: at.Add(time.Minute), Kind: progress.GaveUp, Problem: "p-one", Attempt: att, Mode: progress.Practice})
	}
	m := send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 120, Height: 30})
	if view := plain(m); !strings.Contains(view, "weak spot · one") {
		t.Fatalf("a technique you keep failing should be called out:\n%s", view)
	}
}
