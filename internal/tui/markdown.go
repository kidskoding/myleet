package tui

import (
	"regexp"
	"strings"

	"charm.land/glamour/v2"
	"charm.land/glamour/v2/ansi"
)

func ptr[T any](v T) *T { return &v }

// markdownStyle uses only the 16 terminal colors so notes follow the terminal
// theme; glamour's own color styles use 256-color codes.
func markdownStyle() ansi.StyleConfig {
	accent, muted, code := ptr("4"), ptr("8"), ptr("3")
	return ansi.StyleConfig{
		Document:       ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{BlockPrefix: "\n", BlockSuffix: "\n"}, Margin: ptr(uint(0))},
		BlockQuote:     ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Italic: ptr(true)}, Indent: ptr(uint(1)), IndentToken: ptr("│ ")},
		Paragraph:      ansi.StyleBlock{},
		List:           ansi.StyleList{LevelIndent: 2},
		Heading:        ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{BlockSuffix: "\n", Bold: ptr(true)}},
		H1:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Prefix: " ", Suffix: " ", Color: accent, Inverse: ptr(true), Bold: ptr(true)}},
		H2:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Prefix: "▍ ", Color: accent, Bold: ptr(true)}},
		H3:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Color: accent, Bold: ptr(true)}},
		H4:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Bold: ptr(true)}},
		H5:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Bold: ptr(true)}},
		H6:             ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Bold: ptr(true), Color: muted}},
		Strong:         ansi.StylePrimitive{Bold: ptr(true)},
		Emph:           ansi.StylePrimitive{Italic: ptr(true)},
		Strikethrough:  ansi.StylePrimitive{CrossedOut: ptr(true)},
		HorizontalRule: ansi.StylePrimitive{Color: muted, Format: "\n────────\n"},
		Item:           ansi.StylePrimitive{BlockPrefix: "• "},
		Enumeration:    ansi.StylePrimitive{BlockPrefix: ". "},
		Task:           ansi.StyleTask{Ticked: "[✓] ", Unticked: "[ ] "},
		Link:           ansi.StylePrimitive{Color: muted, Underline: ptr(true)},
		LinkText:       ansi.StylePrimitive{Color: accent},
		ImageText:      ansi.StylePrimitive{Format: "Image: {{.text}}"},
		Code:           ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{Color: code}},
		CodeBlock: ansi.StyleCodeBlock{StyleBlock: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{Color: code}, Margin: ptr(uint(2)),
		}},
		Table: ansi.StyleTable{
			CenterSeparator: ptr("┼"), ColumnSeparator: ptr("│"), RowSeparator: ptr("─"),
		},
		DefinitionDescription: ansi.StylePrimitive{BlockPrefix: "\n  "},
	}
}

// noteLink matches a link to another repo file; those paths mean nothing in a terminal.
var noteLink = regexp.MustCompile(`(^|[^!])\[([^\]]+)\]\([^)\s:]+\)`)

func renderMarkdown(md string, width int) string {
	md = noteLink.ReplaceAllString(md, "$1$2")
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
