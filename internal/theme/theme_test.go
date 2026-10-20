package theme

import (
	"image/color"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"
)

func TestThemeANSIOnly(t *testing.T) {
	styles := New().All()
	if len(styles) == 0 {
		t.Fatal("no styles")
	}
	for i, s := range styles {
		if fg, ok := s.GetForeground().(ansi.BasicColor); ok {
			if fg > 15 {
				t.Errorf("style %d foreground %d outside ANSI 0-15", i, fg)
			}
		} else if _, unset := s.GetForeground().(lipgloss.NoColor); !unset {
			t.Errorf("style %d foreground %T is not an ANSI basic color", i, s.GetForeground())
		}
		if _, unset := s.GetBackground().(lipgloss.NoColor); !unset {
			t.Errorf("style %d sets a background %v", i, s.GetBackground())
		}
	}
}

func TestSemanticColors(t *testing.T) {
	th := New()
	want := map[string]color.Color{
		"accent": ansi.BasicColor(4), "pass": ansi.BasicColor(2), "fail": ansi.BasicColor(1),
		"due": ansi.BasicColor(3), "muted": ansi.BasicColor(8),
	}
	got := map[string]color.Color{
		"accent": th.Accent.GetForeground(), "pass": th.Pass.GetForeground(), "fail": th.Fail.GetForeground(),
		"due": th.Due.GetForeground(), "muted": th.Muted.GetForeground(),
	}
	for k, w := range want {
		if got[k] != w {
			t.Errorf("%s = %v, want %v", k, got[k], w)
		}
	}
}
