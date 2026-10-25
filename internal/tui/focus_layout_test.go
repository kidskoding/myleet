package tui

import (
	"fmt"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
)

func TestTestLabel(t *testing.T) {
	cases := map[[2]string]string{
		{"min_eating_speed", "test_min_eating_speed_one_pile"}: "one pile",
		{"add", "test_other_case"}:                             "other case",
		{"add", "test_add"}:                                    "add",
		{"Codec", "test_codec_roundtrip"}:                      "roundtrip",
		{"", "test_two_sum_basic"}:                             "two sum basic",
	}
	for in, want := range cases {
		if got := testLabel(in[0], in[1]); got != want {
			t.Errorf("testLabel(%q, %q) = %q, want %q", in[0], in[1], got, want)
		}
	}
}

func wideFocus(t *testing.T, fp fakePrompts, results ...runner.Result) (tea.Model, *Shared) {
	t.Helper()
	s := newTestShared(t, newTestApp(t), &fakeRunner{results: results})
	s.Prompts = fp
	m := tea.Model(New(s, "p-one"))
	m = send(m, tea.WindowSizeMsg{Width: 120, Height: 32})
	return drain(m, m.Init()), s
}

func TestFocusWideHasSidebar(t *testing.T) {
	m, _ := wideFocus(t, fakePrompts{md: "Add two numbers.", status: prompt.Fetched}, red)
	view := plain(m)
	for _, want := range []string{"╭─ 00:00 / 15:00", "tests 1/2", "✓ add", "✗ negative", "say it aloud", "Add two numbers."} {
		if !strings.Contains(view, want) {
			t.Fatalf("wide focus missing %q:\n%s", want, view)
		}
	}
	assertFits(t, view, 120, 32)
}

func TestFocusNarrowIsStacked(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	view := plain(m)
	if !strings.Contains(view, "⏱") || !strings.Contains(view, "tests ●✗ 1/2") || strings.Contains(view, "╭─ 00:00") {
		t.Fatalf("narrow focus should stack:\n%s", view)
	}
}

func TestFocusResizeWideToNarrow(t *testing.T) {
	m, _ := wideFocus(t, fakePrompts{status: prompt.NoSource}, red)
	m = send(m, tea.WindowSizeMsg{Width: 80, Height: 24})
	view := plain(m)
	if strings.Contains(view, "╭─ 00:00") {
		t.Fatalf("sidebar should go away when narrow:\n%s", view)
	}
	assertFits(t, view, 80, 24)
}

func TestFocusEmptyStatementWide(t *testing.T) {
	m, _ := wideFocus(t, fakePrompts{status: prompt.NoSource}, red)
	view := plain(m)
	if !strings.Contains(view, "say it aloud") || !strings.Contains(view, "complexity") {
		t.Fatalf("sidebar must render fully with a short statement:\n%s", view)
	}
}

func TestFocusLongTitleTruncates(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	p, _ := s.App.Catalog.Problem("p-one")
	p.Title = strings.Repeat("Very Long Problem Title ", 7)
	view := plain(send(m, tea.WindowSizeMsg{Width: 80, Height: 24}))
	assertFits(t, view, 80, 24)
	if !strings.Contains(view, "…") {
		t.Fatalf("long title should truncate:\n%s", view)
	}
}

func TestFocusPassCard(t *testing.T) {
	m, s := wideFocus(t, fakePrompts{status: prompt.NoSource}, red, green)
	touch(t, s, "p-one")
	m = send(m, key("space"))
	if view := plain(m); !strings.Contains(view, "╭─ ✓ first pass") {
		t.Fatalf("pass should show a success card:\n%s", view)
	}
	_ = progress.Passed
}

func TestFocusFailCardShowsAssertion(t *testing.T) {
	m, _ := wideFocus(t, fakePrompts{status: prompt.NoSource}, red)
	view := plain(m)
	for _, want := range []string{"╭─ tests · 1/2 passed", "✗ negative", "assert 4 == 0", "✓ add"} {
		if !strings.Contains(view, want) {
			t.Fatalf("tests window missing %q:\n%s", want, view)
		}
	}
}

func TestResetIsModal(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	if view := plain(send(m, key("r"))); !strings.Contains(view, "╭─ reset") || !strings.Contains(view, "kept as a snapshot") {
		t.Fatalf("reset prompt should be a modal:\n%s", view)
	}
}

func TestSpinnerWhileRunning(t *testing.T) {
	m, s := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{red}})
	f := m.(Model).top().(*Focus)
	f.running = true
	f.frame = 3
	_ = s
	if view := plain(m); !strings.Contains(view, "⠸") {
		t.Fatalf("running tests should show the spinner frame:\n%s", view)
	}
	send(m, spinMsg{f: f})
	if f.frame != 4 {
		t.Fatalf("spinMsg should advance the frame, got %d", f.frame)
	}
}

func TestFocusGoldenWide(t *testing.T) {
	m, _ := wideFocus(t, fakePrompts{md: "Given two integers `a` and `b`, return their sum.\n\n**Example 1:**\n\n```\nInput: a = 1, b = 2\nOutput: 3\n```", status: prompt.Fetched}, red)
	assertGolden(t, "focus_wide", plain(m))
}

func longFailure() runner.Result {
	var tb []string
	for i := 1; i <= 40; i++ {
		tb = append(tb, fmt.Sprintf("solution.py:%d: in add  frame %d", i, i))
	}
	tb = append(tb, "E   AssertionError: the very last line of the traceback")
	return runner.Result{Passed: 1, Total: 2, Tests: []runner.TestResult{
		{Name: "test_add", Outcome: runner.Passed},
		{Name: "test_add_negative", Outcome: runner.Failed, Message: "assert 4 == 0", Detail: strings.Join(tb, "\n")},
	}}
}

func TestFocusTestsWindowScrollsToFullTraceback(t *testing.T) {
	for _, size := range [][2]int{{60, 20}, {80, 24}, {120, 32}, {160, 40}} {
		m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{longFailure()}})
		m = send(m, tea.WindowSizeMsg{Width: size[0], Height: size[1]})
		if view := plain(m); strings.Contains(view, "very last line") {
			t.Fatalf("%v: traceback should start scrolled to the top:\n%s", size, view)
		}
		m = send(m, key("tab"), key("end"))
		view := plain(m)
		assertFits(t, view, size[0], size[1])
		for _, want := range []string{"very last line", "✓ add"} {
			if !strings.Contains(view, want) {
				t.Fatalf("%v: tab+end should reveal %q:\n%s", size, want, view)
			}
		}
		m = send(m, key("home"))
		if view := plain(m); !strings.Contains(view, "✗ negative") {
			t.Fatalf("%v: home should return to the first failure:\n%s", size, view)
		}
	}
}

func TestFocusZoomGivesWindowWholeBody(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{longFailure()}})
	m = send(m, key("tab"), key("z"))
	view := plain(m)
	if strings.Contains(view, "╭─ problem") || !strings.Contains(view, "╭─ tests") {
		t.Fatalf("zoomed tests window should hide the problem window:\n%s", view)
	}
	assertFits(t, view, 80, 24)
	view = plain(send(m, key("esc")))
	if !strings.Contains(view, "╭─ problem") {
		t.Fatalf("esc should unzoom before leaving:\n%s", view)
	}
}

func TestFocusScrollMovesOnlyFocusedWindow(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{longFailure()}})
	f := m.(Model).top().(*Focus)
	m = send(m, key("tab"), key("j"), key("j"))
	_ = plain(m)
	if f.testsTop != 2 || f.scroll != 0 {
		t.Fatalf("j should scroll the tests window only, tests=%d problem=%d", f.testsTop, f.scroll)
	}
}

func rowOf(t *testing.T, view, want string) int {
	t.Helper()
	for i, l := range strings.Split(view, "\n") {
		if strings.Contains(l, want) {
			return i
		}
	}
	t.Fatalf("no row contains %q:\n%s", want, view)
	return -1
}

func TestFocusMouseClickFocusesAndWheelScrolls(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{longFailure()}})
	f := m.(Model).top().(*Focus)
	if m.View().MouseMode != tea.MouseModeCellMotion {
		t.Fatal("focus should turn on mouse reporting")
	}
	y := rowOf(t, plain(m), "✗ negative")
	m = send(m, tea.MouseClickMsg{X: 10, Y: y, Button: tea.MouseLeft})
	if f.win != winTests {
		t.Fatalf("clicking the tests window should focus it, win=%d", f.win)
	}
	m = send(m, tea.MouseWheelMsg{X: 10, Y: y, Button: tea.MouseWheelDown})
	_ = plain(m)
	if f.testsTop != 3 || f.scroll != 0 {
		t.Fatalf("wheel should scroll the window under the pointer, tests=%d problem=%d", f.testsTop, f.scroll)
	}
	py := rowOf(t, plain(m), "╭─ problem") + 1
	send(m, tea.MouseClickMsg{X: 10, Y: py, Button: tea.MouseLeft})
	if f.win != winProblem {
		t.Fatalf("clicking the problem window should focus it, win=%d", f.win)
	}
}

func TestFocusCopyFocusedWindow(t *testing.T) {
	m, _ := focusModel(t, "p-one", &fakeRunner{results: []runner.Result{longFailure()}})
	m = send(m, key("tab"))
	_, cmd := m.Update(key("y"))
	if cmd == nil {
		t.Fatal("y should return a clipboard command")
	}
	if !strings.Contains(plain(send(m, key("y"))), "copied test output") {
		t.Fatal("y should confirm the copy")
	}
}

func TestInterviewRoundMouseReachesProblem(t *testing.T) {
	m, _, iv := interviewModel(t, &fakeRunner{results: []runner.Result{longFailure()}})
	y := rowOf(t, plain(m), "✗ negative")
	m = send(m, tea.MouseClickMsg{X: 10, Y: y, Button: tea.MouseLeft})
	if iv.foci[iv.cur].win != winTests {
		t.Fatal("a click in a round should land on the current problem's tests window")
	}
	if m.View().MouseMode != tea.MouseModeCellMotion {
		t.Fatal("rounds should turn on mouse reporting")
	}
}
