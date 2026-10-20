package ui

import (
	"regexp"
	"strings"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/theme"
)

var th = theme.New()

func lines(s string) []string { return strings.Split(s, "\n") }

func TestCardWidthExact(t *testing.T) {
	for _, w := range []int{10, 40, 79} {
		out := Card(th, "title", "hello\nworld", w, false)
		for i, l := range lines(out) {
			if got := lipgloss.Width(l); got != w {
				t.Fatalf("width %d: line %d is %d wide: %q", w, i, got, ansi.Strip(l))
			}
		}
		first := ansi.Strip(lines(out)[0])
		if !strings.HasPrefix(first, "╭─ ti") || !strings.HasSuffix(first, "╮") {
			t.Fatalf("top border %q", first)
		}
	}
}

func TestCardTruncatesLongLines(t *testing.T) {
	out := Card(th, "t", strings.Repeat("x", 200), 30, false)
	body := ansi.Strip(lines(out)[1])
	if !strings.HasSuffix(body, "… │") && !strings.HasSuffix(body, "…│") {
		t.Fatalf("body line %q", body)
	}
}

func TestCardTinyWidth(t *testing.T) {
	_ = Card(th, "long title here", "body", 4, true)
	_ = Card(th, "", "", 0, false)
}

func TestBarFill(t *testing.T) {
	if got := ansi.Strip(Bar(th, 0.5, 10, ToneAccent)); got != "█████░░░░░" {
		t.Fatalf("bar = %q", got)
	}
	if got := ansi.Strip(Bar(th, 2, 4, TonePass)); got != "████" {
		t.Fatalf("clamp high = %q", got)
	}
	if got := ansi.Strip(Bar(th, -1, 4, TonePass)); got != "░░░░" {
		t.Fatalf("clamp low = %q", got)
	}
}

func TestKeyBarDropsToFit(t *testing.T) {
	keys := []Key{{"enter", "start"}, {"j/k", "move"}, {"/", "search"}, {"m", "map"}, {"i", "interview"}, {"s", "stats"}}
	out := KeyBar(th, keys, 40, "saved")
	plain := ansi.Strip(out)
	if lipgloss.Width(out) > 40 || !strings.Contains(plain, "enter start") || !strings.Contains(plain, "? more") || !strings.HasSuffix(strings.TrimRight(plain, " "), "saved") {
		t.Fatalf("key bar %q (%d wide)", plain, lipgloss.Width(out))
	}
}

func TestTabBarActive(t *testing.T) {
	out := TabBar(th, []string{"today", "map", "interview", "playlists", "stats"}, 1, 70)
	ls := lines(out)
	if len(ls) != 2 {
		t.Fatalf("tab bar should be 2 lines, got %d", len(ls))
	}
	first := ansi.Strip(ls[0])
	for _, want := range []string{"myleet", "today", "map", "interview", "playlists", "stats"} {
		if !strings.Contains(first, want) {
			t.Fatalf("missing %q in %q", want, first)
		}
	}
	if strings.Trim(ansi.Strip(ls[1]), "─") != "" || lipgloss.Width(ls[1]) != 70 {
		t.Fatalf("rule %q", ansi.Strip(ls[1]))
	}
}

func TestModalCentered(t *testing.T) {
	out := Modal(th, "keys", "a\nb", 80, 24)
	ls := lines(out)
	if len(ls) != 24 {
		t.Fatalf("modal block has %d lines", len(ls))
	}
	for _, l := range ls {
		if idx := strings.Index(ansi.Strip(l), "╭"); idx >= 0 {
			if idx <= 10 {
				t.Fatalf("modal not centered: border at column %d", idx)
			}
			return
		}
	}
	t.Fatal("no border found")
}

func TestColumnsJoin(t *testing.T) {
	a := "aaaaa\naaaaa\naaaaa"
	b := "bbbbbbb\nbbbbbbb\nbbbbbbb"
	for _, l := range lines(Columns(2, a, b)) {
		if lipgloss.Width(l) != 14 {
			t.Fatalf("line %q", l)
		}
	}
}

func TestDots(t *testing.T) {
	if got := ansi.Strip(Dots(th, []bool{true, true, false})); got != "●●○" {
		t.Fatalf("dots = %q", got)
	}
}

func TestSpinnerFrames(t *testing.T) {
	if SpinnerFrame(0) == SpinnerFrame(1) || SpinnerFrame(0) != SpinnerFrame(10) {
		t.Fatal("spinner should cycle through 10 frames")
	}
}

func TestKitANSIOnly(t *testing.T) {
	trueColor := regexp.MustCompile(`\x1b\[[0-9;]*(38;[25]|48;)`)
	out := Badge(th, "REVIEW", BadgeReview) + Badge(th, "med", BadgeMedium) + Bar(th, 0.3, 10, ToneFail) +
		Card(th, "x", "y", 20, true) + TabBar(th, []string{"a", "b"}, 0, 20)
	if trueColor.MatchString(out) {
		t.Fatalf("kit must only use ANSI 0-15: %q", out)
	}
}
