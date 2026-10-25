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

// WrapLines word-wraps s to width, preserving ANSI sequences. Empty input stays one blank line.
func WrapLines(s string, width int) []string {
	if width <= 0 {
		return nil
	}
	if s == "" {
		return []string{""}
	}
	return strings.Split(ansi.Wordwrap(s, width, " "), "\n")
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
		for _, part := range WrapLines(line, content) {
			out = append(out, border.Render("│")+" "+Pad(part, content)+" "+border.Render("│"))
		}
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
	return KeyBarLines(th, keys, width, right, 1)[0]
}

func KeyBarLines(th theme.Theme, keys []Key, width int, right string, maxLines int) []string {
	sep := th.Border.Render(" · ")
	more := th.Accent.Render("?") + " " + th.Muted.Render("more")
	rightW := lipgloss.Width(right)
	maxLines = max(maxLines, 1)
	for n := len(keys); n >= 0; n-- {
		parts := make([]string, 0, n+1)
		for _, k := range keys[:n] {
			parts = append(parts, th.Accent.Render(k.Key)+" "+th.Muted.Render(k.Label))
		}
		parts = append(parts, more)
		lines := []string{" " + parts[0]}
		for _, p := range parts[1:] {
			last := &lines[len(lines)-1]
			if lipgloss.Width(*last+sep+p) <= width {
				*last += sep + p
			} else {
				lines = append(lines, " "+p)
			}
		}
		gap := width - lipgloss.Width(lines[len(lines)-1]) - rightW
		if (len(lines) <= maxLines && gap >= 1) || n == 0 {
			lines = lines[:min(len(lines), maxLines)]
			for i := range lines {
				lines[i] = Pad(lines[i], width)
			}
			if right != "" {
				i := len(lines) - 1
				l := strings.TrimRight(lines[i], " ")
				lines[i] = Pad(l+strings.Repeat(" ", max(width-lipgloss.Width(l)-rightW, 1))+right, width)
			}
			return lines
		}
	}
	return []string{Pad(" "+more, width)}
}

func Modal(th theme.Theme, title, body string, width, height int) string {
	return ModalTone(th, title, body, width, height, ToneMuted)
}

// ModalTone is Modal with a tinted border/title (e.g. ToneFail for destructive confirms).
func ModalTone(th theme.Theme, title, body string, width, height int, tone Tone) string {
	widest := lipgloss.Width(title) + 6
	for _, l := range strings.Split(body, "\n") {
		widest = max(widest, lipgloss.Width(l)+4)
	}
	cardW := min(max(widest, 30), max(width-4, 4))
	// Wrap before counting, so wrapped lines cannot push the border off-screen.
	var lines []string
	for _, l := range strings.Split(body, "\n") {
		lines = append(lines, WrapLines(l, max(cardW-4, 1))...)
	}
	if room := max(height-2, 1); len(lines) > room {
		lines = append(lines[:room-1], "…")
	}
	joined := strings.Join(lines, "\n")
	var box string
	if tone == ToneMuted {
		box = Card(th, title, joined, cardW, true)
	} else {
		box = CardTone(th, title, joined, cardW, tone)
	}
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

// WideMin is the terminal width at which two-panel Today layouts sit side by side.
const WideMin = 100

// SplitRow returns left/right column widths for a two-panel row inside totalWidth.
// ok is false when the terminal is too narrow (caller should stack full-width panels).
func SplitRow(totalWidth, gap int) (left, right int, ok bool) {
	if totalWidth < WideMin || totalWidth <= gap {
		return 0, 0, false
	}
	inner := totalWidth - gap
	left = inner * 3 / 5
	if left < 24 {
		left = 24
	}
	right = inner - left
	if right < 20 {
		return 0, 0, false
	}
	return left, right, true
}

// JoinPanels places left and right side by side with gap, or stacks them when narrow.
// left and right must already be rendered at leftW/rightW (or totalWidth when stacking).
func JoinPanels(left, right string, gap, totalWidth int) string {
	if _, _, ok := SplitRow(totalWidth, gap); !ok {
		if right == "" {
			return left
		}
		if left == "" {
			return right
		}
		return left + "\n\n" + right
	}
	return Columns(gap, left, right)
}

var spinner = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

func SpinnerFrame(i int) string { return spinner[((i%len(spinner))+len(spinner))%len(spinner)] }
