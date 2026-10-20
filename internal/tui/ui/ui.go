package ui

import (
	"math"
	"strings"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/theme"
)

type Tone int

const (
	ToneMuted Tone = iota
	ToneAccent
	TonePass
	ToneDue
	ToneFail
)

type BadgeKind int

const (
	BadgeReview BadgeKind = iota
	BadgeNew
	BadgeEasy
	BadgeMedium
	BadgeHard
	BadgeInfo
)

type Key struct{ Key, Label string }

func toneStyle(th theme.Theme, t Tone) lipgloss.Style {
	switch t {
	case ToneAccent:
		return th.Accent
	case TonePass:
		return th.Pass
	case ToneDue:
		return th.Due
	case ToneFail:
		return th.Fail
	}
	return th.Muted
}

func Truncate(s string, width int) string {
	if width <= 0 {
		return ""
	}
	return ansi.Truncate(s, width, "…")
}

func Pad(s string, width int) string {
	if width <= 0 {
		return ""
	}
	s = Truncate(s, width)
	return s + strings.Repeat(" ", max(width-lipgloss.Width(s), 0))
}

func Card(th theme.Theme, title, body string, width int, active bool) string {
	if active {
		return card(th.Accent, th.Selected, title, body, width)
	}
	return card(th.Border, th.Title, title, body, width)
}

// CardTone draws a card whose border and title take tone, e.g. a green success card.
func CardTone(th theme.Theme, title, body string, width int, tone Tone) string {
	style := toneStyle(th, tone)
	return card(style, style.Bold(true), title, body, width)
}

func card(border, titleStyle lipgloss.Style, title, body string, width int) string {
	width = max(width, 4)
	inner := width - 2
	var top string
	if title == "" || inner < 6 {
		top = border.Render("╭" + strings.Repeat("─", inner) + "╮")
	} else {
		t := Truncate(title, inner-4)
		fill := inner - 3 - lipgloss.Width(t)
		top = border.Render("╭─ ") + titleStyle.Render(t) + border.Render(" "+strings.Repeat("─", max(fill, 0))+"╮")
	}
	out := []string{top}
	content := max(inner-2, 0)
	for _, line := range strings.Split(body, "\n") {
		out = append(out, border.Render("│")+" "+Pad(line, content)+" "+border.Render("│"))
	}
	out = append(out, border.Render("╰"+strings.Repeat("─", inner)+"╯"))
	if inner < 2 {
		for i := range out {
			out[i] = Pad(out[i], width)
		}
	}
	return strings.Join(out, "\n")
}

// Badge uses reverse video so the pill takes the terminal's own colors.
func Badge(th theme.Theme, text string, kind BadgeKind) string {
	style := map[BadgeKind]lipgloss.Style{
		BadgeReview: th.Due, BadgeNew: th.Accent, BadgeEasy: th.Pass,
		BadgeMedium: th.Due, BadgeHard: th.Fail, BadgeInfo: th.Muted,
	}[kind]
	return style.Reverse(true).Bold(true).Render(" " + text + " ")
}

func Bar(th theme.Theme, frac float64, width int, tone Tone) string {
	if width <= 0 {
		return ""
	}
	frac = math.Max(0, math.Min(1, frac))
	n := int(math.Round(frac * float64(width)))
	return toneStyle(th, tone).Render(strings.Repeat("█", n)) + th.Muted.Render(strings.Repeat("░", width-n))
}

func Dots(th theme.Theme, days []bool) string {
	var b strings.Builder
	for _, on := range days {
		if on {
			b.WriteString(th.Pass.Render("●"))
		} else {
			b.WriteString(th.Muted.Render("○"))
		}
	}
	return b.String()
}

func TabBar(th theme.Theme, tabs []string, active, width int) string {
	parts := make([]string, len(tabs))
	for i, t := range tabs {
		if i == active {
			parts[i] = th.Accent.Reverse(true).Bold(true).Render(" " + t + " ")
		} else {
			parts[i] = th.Muted.Render(" " + t + " ")
		}
	}
	line := " " + th.Title.Render("myleet") + "   " + strings.Join(parts, th.Border.Render("·"))
	return Pad(line, width) + "\n" + th.Border.Render(strings.Repeat("─", max(width, 0)))
}

// KeyBar drops trailing keys until the keys and the toast fit.
func KeyBar(th theme.Theme, keys []Key, width int, right string) string {
	sep := th.Border.Render(" · ")
	more := th.Accent.Render("?") + " " + th.Muted.Render("more")
	rightW := lipgloss.Width(right)
	for n := len(keys); n >= 0; n-- {
		parts := make([]string, 0, n+1)
		for _, k := range keys[:n] {
			parts = append(parts, th.Accent.Render(k.Key)+" "+th.Muted.Render(k.Label))
		}
		parts = append(parts, more)
		left := " " + strings.Join(parts, sep)
		gap := width - lipgloss.Width(left) - rightW
		if gap >= 1 || n == 0 {
			if right == "" {
				return Pad(left, width)
			}
			return Pad(left+strings.Repeat(" ", max(gap, 1))+right, width)
		}
	}
	return Pad(" "+more, width)
}

func Modal(th theme.Theme, title, body string, width, height int) string {
	widest := lipgloss.Width(title) + 6
	for _, l := range strings.Split(body, "\n") {
		widest = max(widest, lipgloss.Width(l)+4)
	}
	cardW := min(max(widest, 30), max(width-4, 4))
	lines := strings.Split(body, "\n")
	if room := max(height-2, 1); len(lines) > room {
		lines = append(lines[:room-1], "…")
	}
	box := Card(th, title, strings.Join(lines, "\n"), cardW, true)
	return lipgloss.Place(max(width, 1), max(height, 1), lipgloss.Center, lipgloss.Center, box)
}

func Columns(gap int, cols ...string) string {
	split := make([][]string, len(cols))
	widths := make([]int, len(cols))
	rows := 0
	for i, c := range cols {
		split[i] = strings.Split(c, "\n")
		rows = max(rows, len(split[i]))
		for _, l := range split[i] {
			widths[i] = max(widths[i], lipgloss.Width(l))
		}
	}
	out := make([]string, rows)
	for r := 0; r < rows; r++ {
		var b strings.Builder
		for i := range cols {
			if i > 0 {
				b.WriteString(strings.Repeat(" ", gap))
			}
			cell := ""
			if r < len(split[i]) {
				cell = split[i][r]
			}
			b.WriteString(Pad(cell, widths[i]))
		}
		out[r] = b.String()
	}
	return strings.Join(out, "\n")
}

var spinner = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

func SpinnerFrame(i int) string { return spinner[((i%len(spinner))+len(spinner))%len(spinner)] }
