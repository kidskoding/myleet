package tui

import (
	"regexp"
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

const sampleNote = "# How to Prepare\n\nA **pattern** is *reusable*; call `seen.add(x)`.\n\n## Use the Book\n\n### Detail\n\n```text\nlearn -> solve -> review\n```\n\n> quoted\n\n- one\n- two\n\n---\n"

func TestMarkdownHidesSyntax(t *testing.T) {
	out := ansi.Strip(renderMarkdown(sampleNote, 80))
	for _, raw := range []string{"# ", "**", "`", "*reusable*", "---"} {
		if strings.Contains(out, raw) {
			t.Errorf("rendered note should not show %q:\n%s", raw, out)
		}
	}
	for _, text := range []string{"How to Prepare", "pattern", "seen.add(x)", "Use the Book", "learn -> solve -> review", "quoted", "one"} {
		if !strings.Contains(out, text) {
			t.Errorf("rendered note lost %q:\n%s", text, out)
		}
	}
}

func TestMarkdownStylesHeadingsAndCode(t *testing.T) {
	out := renderMarkdown(sampleNote, 80)
	line := func(text string) string {
		for _, l := range strings.Split(out, "\n") {
			if strings.Contains(ansi.Strip(l), text) {
				return l
			}
		}
		t.Fatalf("no line with %q", text)
		return ""
	}
	if h1 := line("How to Prepare"); !hasSGR(h1, "7") {
		t.Errorf("h1 should be a reverse-video title: %q", h1)
	}
	if h2 := line("Use the Book"); !hasSGR(h2, "1") || !hasSGR(h2, "34") {
		t.Errorf("h2 should be bold accent: %q", h2)
	}
	if code := line("learn -> solve"); !strings.HasPrefix(ansi.Strip(code), "  ") || !hasSGR(code, "33") {
		t.Errorf("code blocks should be indented and colored: %q", code)
	}
}

func TestMarkdownUsesTerminalPalette(t *testing.T) {
	out := renderMarkdown(sampleNote, 80)
	if regexp.MustCompile(`\x1b\[[0-9;]*(38|48);[25];`).MatchString(out) {
		t.Fatalf("notes must use only the 16 terminal colors:\n%q", out)
	}
}

// hasSGR reports whether any escape sequence in s sets the given SGR parameter.
func hasSGR(s, param string) bool {
	for _, m := range regexp.MustCompile(`\x1b\[([0-9;]*)m`).FindAllStringSubmatch(s, -1) {
		for _, p := range strings.Split(m[1], ";") {
			if p == param {
				return true
			}
		}
	}
	return false
}

func TestMarkdownRelativeLinksShowOnlyText(t *testing.T) {
	out := ansi.Strip(renderMarkdown("See [common costs](../../guide/04_costs.md#lists) and [LeetCode](https://leetcode.com/problems/two-sum/).", 120))
	if !strings.Contains(out, "See common costs and LeetCode") || strings.Contains(out, "04_costs") {
		t.Fatalf("a link to another note should show only its text: %q", out)
	}
	if !strings.Contains(out, "https://leetcode.com/problems/two-sum/") {
		t.Fatalf("web links should keep their URL: %q", out)
	}
}
