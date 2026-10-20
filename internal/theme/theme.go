// Package theme uses only the terminal's 16-color palette and never sets a
// background, so the user's terminal theme decides every color.
package theme

import (
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"
)

const (
	Red         = ansi.BasicColor(1)
	Green       = ansi.BasicColor(2)
	Yellow      = ansi.BasicColor(3)
	Blue        = ansi.BasicColor(4)
	BrightBlack = ansi.BasicColor(8)
)

type Theme struct {
	Accent   lipgloss.Style
	Pass     lipgloss.Style
	Fail     lipgloss.Style
	Due      lipgloss.Style
	Muted    lipgloss.Style
	Title    lipgloss.Style
	Selected lipgloss.Style
	Border   lipgloss.Style
}

func New() Theme {
	base := lipgloss.NewStyle()
	return Theme{
		Accent:   base.Foreground(Blue),
		Pass:     base.Foreground(Green),
		Fail:     base.Foreground(Red),
		Due:      base.Foreground(Yellow),
		Muted:    base.Foreground(BrightBlack),
		Title:    base.Bold(true),
		Selected: base.Foreground(Blue).Bold(true),
		Border:   base.Foreground(BrightBlack),
	}
}

func (t Theme) All() []lipgloss.Style {
	return []lipgloss.Style{t.Accent, t.Pass, t.Fail, t.Due, t.Muted, t.Title, t.Selected, t.Border}
}
