package tui

import (
	"strings"

	"charm.land/glamour/v2"
	"charm.land/glamour/v2/ansi"
	"charm.land/glamour/v2/styles"
)

func ptr[T any](v T) *T { return &v }

// markdownStyle starts from glamour's ASCII style because its color themes use
// 256-color codes, which would ignore the terminal palette.
func markdownStyle() ansi.StyleConfig {
	cfg := styles.ASCIIStyleConfig
	cfg.Document.Margin = ptr(uint(0))
	accent := ansi.StylePrimitive{Color: ptr("4"), Bold: ptr(true)}
	cfg.H1.StylePrimitive = withPrefix(accent, "# ")
	cfg.H2.StylePrimitive = withPrefix(accent, "## ")
	cfg.H3.StylePrimitive = withPrefix(accent, "### ")
	cfg.Strong = ansi.StylePrimitive{Bold: ptr(true)}
	cfg.Code.StylePrimitive = ansi.StylePrimitive{Color: ptr("3")}
	cfg.Link = ansi.StylePrimitive{Color: ptr("4"), Underline: ptr(true)}
	return cfg
}

func withPrefix(p ansi.StylePrimitive, prefix string) ansi.StylePrimitive {
	p.Prefix = prefix
	return p
}

func renderMarkdown(md string, width int) string {
	r, err := glamour.NewTermRenderer(glamour.WithStyles(markdownStyle()), glamour.WithWordWrap(max(width, 20)))
	if err != nil {
		return md
	}
	out, err := r.Render(md)
	if err != nil {
		return md
	}
	return strings.Trim(out, "\n")
}
