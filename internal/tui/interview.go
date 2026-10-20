package tui

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/interview"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

type phase int

const (
	phaseSetup phase = iota
	phaseRound
	phaseSelfCheck
	phaseReveal
)

var selfChecks = []string{"restated the problem", "named the brute force", "stated time and space complexity", "covered edge cases"}

type interviewTickMsg struct{ iv *Interview }

type Interview struct {
	s       *Shared
	phase   phase
	n       int
	pick    func(n int) []*catalog.Problem
	foci    []*Focus
	cur     int
	start   time.Time
	done    []bool
	passed  []bool
	times   []time.Duration
	checks  []bool
	confirm bool
	spent   []time.Duration // time on each problem while it was the current tab
	since   time.Time
}

func NewInterview(s *Shared) Screen {
	iv := &Interview{s: s, n: 1, checks: make([]bool, len(selfChecks))}
	iv.pick = func(n int) []*catalog.Problem {
		return interview.Pick(s.App.Catalog, s.States(), s.App.Attempts(), n, s.App.Now(), s.Rand)
	}
	return iv
}

func (iv *Interview) Title() string { return "interview" }

func (iv *Interview) Tab() int { return 2 }

// During a round every key belongs to the round so q, / and digits cannot end it by
// accident; the self-check owns tab keys too, or the reveal would be lost.
func (iv *Interview) OwnsKey(k string) bool {
	switch iv.phase {
	case phaseRound:
		return k != "?"
	case phaseSelfCheck:
		return k != "?" && k != "q"
	case phaseSetup:
		return k == "1" || k == "2" || k == "3"
	}
	return false
}

func (iv *Interview) Help() []string {
	return []string{"setup:  1-3 or ←/→ problems, enter to start", "round:  e edit  t hint (+3:00)  tab next  space submit  q abandon",
		"after:  1-4 tick the self-check, enter to reveal"}
}

func (iv *Interview) penalties() time.Duration {
	var total time.Duration
	for _, f := range iv.foci {
		total += f.penalties
	}
	return total
}

func (iv *Interview) remaining() time.Duration {
	return interview.RoundLength - iv.s.App.Now().Sub(iv.start) - iv.penalties()
}

func (iv *Interview) tick() tea.Cmd {
	t := iv.s.Tick()
	if t == nil {
		return nil
	}
	return func() tea.Msg { t(); return interviewTickMsg{iv} }
}

func (iv *Interview) begin() tea.Cmd {
	problems := iv.pick(iv.n)
	if len(problems) == 0 {
		iv.s.Toast("no problems to pick from")
		return nil
	}
	iv.start = iv.s.App.Now()
	iv.since = iv.start
	iv.phase = phaseRound
	iv.done, iv.passed, iv.times = make([]bool, len(problems)), make([]bool, len(problems)), make([]time.Duration, len(problems))
	iv.spent = make([]time.Duration, len(problems))
	cmds := []tea.Cmd{iv.tick()}
	for _, p := range problems {
		f := newFocus(iv.s, p, progress.Interview)
		i := len(iv.foci)
		f.clock = func() time.Duration { return iv.elapsedOf(i) }
		iv.foci = append(iv.foci, f)
		cmds = append(cmds, f.Init())
	}
	return tea.Batch(cmds...)
}

// elapsedOf counts only time while problem i was on screen, plus its hint penalties.
func (iv *Interview) elapsedOf(i int) time.Duration {
	d := iv.spent[i] + iv.foci[i].penalties
	if i == iv.cur && !iv.done[i] {
		d += iv.s.App.Now().Sub(iv.since)
	}
	return d
}

func (iv *Interview) switchTo(i int) {
	now := iv.s.App.Now()
	if !iv.done[iv.cur] {
		iv.spent[iv.cur] += now.Sub(iv.since)
	}
	iv.cur, iv.since = i, now
}

func (iv *Interview) submit(i int) {
	if iv.done[i] {
		return
	}
	f := iv.foci[i]
	iv.times[i] = iv.elapsedOf(i)
	if i == iv.cur {
		iv.spent[i] += iv.s.App.Now().Sub(iv.since)
		iv.since = iv.s.App.Now()
	}
	iv.done[i] = true
	if f.Green() {
		iv.passed[i] = true
		f.passed, f.elapsed = true, iv.times[i]
		iv.s.Record(f.event(progress.Passed, map[string]string{"elapsed_ms": strconv.FormatInt(iv.times[i].Milliseconds(), 10)}))
	} else {
		iv.s.Record(f.event(progress.GaveUp, nil))
	}
}

func (iv *Interview) endRound() {
	for i := range iv.foci {
		iv.submit(i)
		iv.foci[i].Close()
	}
	iv.phase = phaseSelfCheck
}

func (iv *Interview) allDone() bool {
	for _, d := range iv.done {
		if !d {
			return false
		}
	}
	return true
}

func (iv *Interview) Close() {
	if iv.phase == phaseRound {
		iv.endRound()
	}
}

func (iv *Interview) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, isKey := msg.(tea.KeyPressMsg)
	if !isKey {
		if t, ok := msg.(interviewTickMsg); ok {
			if t.iv != iv || iv.phase != phaseRound {
				return iv, nil
			}
			if iv.remaining() <= 0 {
				iv.endRound()
				return iv, nil
			}
			return iv, iv.tick()
		}
		var cmds []tea.Cmd
		for _, f := range iv.foci {
			_, cmd := f.Update(msg)
			cmds = append(cmds, cmd)
		}
		return iv, tea.Batch(cmds...)
	}
	key := k.String()
	switch iv.phase {
	case phaseSetup:
		switch key {
		case "1", "2", "3":
			iv.n, _ = strconv.Atoi(key)
		case "left", "h":
			iv.n = max(iv.n-1, 1)
		case "right", "l":
			iv.n = min(iv.n+1, 3)
		case "enter":
			return iv, iv.begin()
		case "esc":
			return iv, pop
		}
	case phaseRound:
		if iv.confirm {
			iv.confirm = false
			if key == "y" {
				iv.endRound()
				return iv, pop
			}
			return iv, nil
		}
		switch key {
		case "q":
			iv.confirm = true
		case "tab":
			iv.switchTo((iv.cur + 1) % len(iv.foci))
		case "space":
			iv.submit(iv.cur)
			if iv.allDone() {
				iv.endRound()
				return iv, nil
			}
			next := iv.cur
			for iv.done[next] {
				next = (next + 1) % len(iv.foci)
			}
			iv.switchTo(next)
		case "esc", "g", "s", "/":
		default:
			_, cmd := iv.foci[iv.cur].Update(msg)
			return iv, cmd
		}
	case phaseSelfCheck:
		if n, err := strconv.Atoi(key); err == nil && n >= 1 && n <= len(iv.checks) {
			iv.checks[n-1] = !iv.checks[n-1]
			if iv.checks[n-1] {
				iv.s.Record(iv.foci[0].event(progress.SayAloudChecked, map[string]string{"item": selfChecks[n-1]}))
			}
		}
		if key == "enter" {
			iv.phase = phaseReveal
		}
	case phaseReveal:
		if key == "enter" || key == "esc" {
			return iv, pop
		}
	}
	return iv, nil
}

func (iv *Interview) Keys() []ui.Key {
	switch iv.phase {
	case phaseRound:
		return []ui.Key{{Key: "e", Label: "edit"}, {Key: "space", Label: "submit"}, {Key: "tab", Label: "next"}, {Key: "t", Label: "hint +3:00"}, {Key: "q", Label: "abandon"}}
	case phaseSelfCheck:
		return []ui.Key{{Key: "1-4", Label: "tick"}, {Key: "enter", Label: "reveal"}}
	case phaseReveal:
		return []ui.Key{{Key: "enter", Label: "done"}}
	}
	return []ui.Key{{Key: "1-3", Label: "problems"}, {Key: "enter", Label: "start"}}
}

func (iv *Interview) View(w, h int) string {
	th := iv.s.Theme
	cardW := min(w-4, 72)
	switch iv.phase {
	case phaseSetup:
		pills := iv.choice(1) + " " + iv.choice(2) + " " + iv.choice(3)
		body := strings.Join([]string{
			"45 minutes. Module and technique stay hidden until the end.",
			"Hints cost 3 minutes. The reference solution is locked.",
			"",
			"problems  " + pills,
		}, "\n")
		return "\n" + strings.Join(indent(ui.Card(th, "mock interview", body, cardW, true), 2), "\n")
	case phaseRound:
		if iv.confirm {
			return ui.Modal(th, "abandon round", "Every unsubmitted problem counts as given up.\n\n"+
				th.Accent.Render("y")+" abandon    "+th.Accent.Render("n")+" keep going", w, h)
		}
		var steps []string
		for i := range iv.foci {
			switch {
			case iv.done[i]:
				steps = append(steps, th.Pass.Render("●"))
			case i == iv.cur:
				steps = append(steps, th.Accent.Render("●"))
			default:
				steps = append(steps, th.Muted.Render("○"))
			}
		}
		rem := iv.remaining()
		clock := th.Title.Render(mmss(rem) + " remaining")
		if rem < 5*time.Minute {
			clock = th.Fail.Bold(true).Render(mmss(rem) + " remaining")
		}
		left := "  " + strings.Join(steps, " ") + th.Muted.Render(fmt.Sprintf("  problem %d of %d", iv.cur+1, len(iv.foci)))
		status := spread(left, clock+"  ", w)
		return strings.Join(append([]string{"", status}, strings.Split(iv.foci[iv.cur].View(w, h-2), "\n")[1:]...), "\n")
	case phaseSelfCheck:
		var body []string
		for i, c := range selfChecks {
			box := th.Muted.Render("[ ]")
			if iv.checks[i] {
				box = th.Pass.Render("[x]")
			}
			body = append(body, fmt.Sprintf("%d %s %s", i+1, box, c))
		}
		return "\n" + strings.Join(indent(ui.Card(th, "round over · be honest", strings.Join(body, "\n"), cardW, true), 2), "\n")
	}
	lines := []string{""}
	for i, f := range iv.foci {
		result := th.Fail.Render("✗ not passed") + th.Muted.Render("  "+mmss(iv.times[i]))
		if iv.passed[i] {
			result = th.Pass.Render("✓ passed") + th.Muted.Render("  "+mmss(iv.times[i]))
		}
		t := f.p.Technique
		body := th.Muted.Render(t.Module.Title+" · "+t.Title) + "\n" + result
		lines = append(lines, indent(ui.Card(th, f.p.Title, body, cardW, false), 2)...)
	}
	return strings.Join(lines, "\n")
}

func (iv *Interview) choice(n int) string {
	if iv.n == n {
		return iv.s.Theme.Accent.Reverse(true).Bold(true).Render(fmt.Sprintf(" [%d] ", n))
	}
	return iv.s.Theme.Muted.Render(fmt.Sprintf(" [%d] ", n))
}
