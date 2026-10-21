package tui

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
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

func placementSkipped() progress.Event {
	return progress.Event{
		Time: testNow, Kind: progress.PlacementDone, Mode: progress.Placement,
		Data: map[string]string{"skipped": "1"},
	}
}

func checkpointSnoozed() progress.Event {
	return progress.Event{
		Time: testNow, Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
		Data: map[string]string{"through": "99", "snoozed": "1"},
	}
}

func homeModel(t *testing.T, events ...progress.Event) tea.Model {
	// Most home tests exercise the queue, not placement/checkpoint recommendations.
	events = append([]progress.Event{placementSkipped(), checkpointSnoozed()}, events...)
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
	if !strings.Contains(view, "all caught up") || !strings.Contains(view, "curriculum map") {
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
		a := newTestApp(t, placementSkipped())
		now := time.Date(2026, 10, 19, hour, 0, 0, 0, tu.Chicago)
		a.Now = func() time.Time { return now }
		m := send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 80, Height: 24})
		if view := plain(m); !strings.Contains(view, want) || !strings.Contains(view, "3 new today") {
			t.Fatalf("%d:00 should greet %q:\n%s", hour, want, view)
		}
	}
}

func TestHomeQueueIsOneCard(t *testing.T) {
	view := plain(homeModel(t))
	if !strings.Contains(view, "╭─ today") || !strings.Contains(view, "╭─ your progress") {
		t.Fatalf("today should show queue + progress panels:\n%s", view)
	}
	if !strings.Contains(view, "▸ ") {
		t.Fatalf("the selected row should be marked:\n%s", view)
	}
}

func TestHomeFocusCardFromWeakest(t *testing.T) {
	a := newTestApp(t, placementSkipped())
	for i := 0; i < 3; i++ {
		att := progress.NewAttemptID()
		at := testNow.AddDate(0, 0, -5+i)
		a.Record(progress.Event{Time: at, Kind: progress.Opened, Problem: "p-one", Attempt: att, Mode: progress.Practice})
		a.Record(progress.Event{Time: at.Add(time.Minute), Kind: progress.GaveUp, Problem: "p-one", Attempt: att, Mode: progress.Practice})
	}
	view := plain(send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 120, Height: 32}))
	if !strings.Contains(view, "╭─ your progress") || !strings.Contains(view, "Where to focus") || !strings.Contains(view, "one") {
		t.Fatalf("progress rail should name the weak technique:\n%s", view)
	}
	if !strings.Contains(view, "difficult") || !strings.Contains(view, "prioritize") {
		t.Fatalf("focus should explain the personalization:\n%s", view)
	}
}

func TestHomeNoFocusCardWhenFresh(t *testing.T) {
	view := plain(homeModel(t))
	if strings.Contains(view, "Where to focus") {
		t.Fatalf("fresh home should not show a focus section:\n%s", view)
	}
	if !strings.Contains(view, "where you are strongest") {
		t.Fatalf("cold start should hint that we personalize:\n%s", view)
	}
}

func TestHomeTitlesUseTheRoom(t *testing.T) {
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	c, err := catalog.Load(root)
	if err != nil {
		t.Skip("real curriculum unavailable")
	}
	a := newTestApp(t, placementSkipped())
	a.Catalog = c
	m := send(New(newTestShared(t, a, &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 80, Height: 24})
	view := plain(m)
	if strings.Contains(view, "…   NEW") || !strings.Contains(view, "Range Sum Query - Immutable") {
		t.Fatalf("at 80 columns titles should not be cut while the reason column has room:\n%s", view)
	}
}

func TestHomeShowsUpcomingReviews(t *testing.T) {
	view := plain(homeModel(t, passedEvents("p-two", 19)...)) // finished today, due tomorrow
	if !strings.Contains(view, "1 review coming due this week") {
		t.Fatalf("today should preview the reviews coming up:\n%s", view)
	}
}

func TestHomeShowsStreakAndMastery(t *testing.T) {
	view := plain(homeModel(t, passedEvents("p-one", 18)...))
	if !strings.Contains(view, "day streak") || !strings.Contains(view, "Mastery") || !strings.Contains(view, "0/4") {
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
	a := newTestApp(t, placementSkipped())
	for i := 0; i < 3; i++ {
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

func TestHomePlacementGateForNewUsers(t *testing.T) {
	m := send(New(newTestShared(t, newTestApp(t), &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 80, Height: 24})
	view := plain(m)
	if !strings.Contains(view, "placement warm-up") || !strings.Contains(view, "right place for you to begin") {
		t.Fatalf("new users should see the placement gate:\n%s", view)
	}
	if !strings.Contains(view, "1. arrays and hashing") || !strings.Contains(view, "5. binary search") || !strings.Contains(view, "begin the warm-up") {
		t.Fatalf("gate should list topics as steps and actions:\n%s", view)
	}
	if !strings.Contains(view, "what happens next") {
		t.Fatalf("gate should explain what happens next:\n%s", view)
	}
	if strings.Contains(view, "╭─ today") {
		t.Fatalf("placement gate should replace the today queue:\n%s", view)
	}
	if strings.Contains(lastLine(view), "/ search") {
		t.Fatalf("placement gate should not offer search:\n%s", view)
	}
	wide := plain(send(New(newTestShared(t, newTestApp(t), &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 120, Height: 32}))
	if !strings.Contains(wide, "what happens next") || !strings.Contains(wide, "placement warm-up") {
		t.Fatalf("wide gate should keep both panels:\n%s", wide)
	}
	m = send(m, key("n"))
	view = plain(m)
	if strings.Contains(view, "placement warm-up") || !strings.Contains(view, "╭─ today") {
		t.Fatalf("skipping placement should unlock today:\n%s", view)
	}
}

func TestHomeEnterStartsPlacement(t *testing.T) {
	m := send(New(newTestShared(t, newTestApp(t), &fakeRunner{}), ""), tea.WindowSizeMsg{Width: 80, Height: 24})
	m = send(m, key("enter"))
	pl, ok := m.(Model).top().(*Placement)
	if !ok {
		t.Fatalf("got %T, want *Placement", m.(Model).top())
	}
	if pl.phase != placeRound {
		t.Fatalf("enter should skip intro and start the round, phase=%d", pl.phase)
	}
}
