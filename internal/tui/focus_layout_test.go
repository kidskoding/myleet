package tui

import (
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
	if view := plain(m); !strings.Contains(view, "╭─ ✗ negative") || !strings.Contains(view, "assert 4 == 0") {
		t.Fatalf("failing test should show a card:\n%s", view)
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
