package tui

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/checkpoint"
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

type timedKind int

const (
	timedMock timedKind = iota
	timedCheckpoint
)

var selfChecks = []string{"restated the problem", "named the brute force", "stated time and space complexity", "covered edge cases"}

type interviewTickMsg struct{ iv *Interview }

type Interview struct {
	s       *Shared
	phase   phase
	kind    timedKind
	n       int
	through int // checkpoint ceiling module number
	ceilIdx int // index into checkpoint.CeilingModules
	pick    func(n int) []*catalog.Problem
	foci    []*Focus
	cur     int
	start   time.Time
	done    []bool
	passed  []bool
	times   []time.Duration
	checks  []bool
	confirm bool
	spent   []time.Duration
	since   time.Time
	outcomes []checkpoint.Outcome // checkpoint only
}

func NewInterview(s *Shared) Screen {
	iv := &Interview{s: s, n: 1, kind: timedMock, checks: make([]bool, len(selfChecks))}
	iv.pick = func(n int) []*catalog.Problem {
		return interview.Pick(s.App.Catalog, s.States(), s.App.Attempts(), n, s.App.Now(), s.Rand)
	}
	ceilings := checkpoint.CeilingModules(s.App.Catalog)
	iv.through = checkpoint.DefaultThrough(s.App.Catalog, s.App.Attempts())
	for i, m := range ceilings {
		if m.Number == iv.through {
			iv.ceilIdx = i
			break
		}
	}
	return iv
}

// NewInterviewCheckpoint opens a Today check-in (not a Timed-tab mode).
func NewInterviewCheckpoint(s *Shared) Screen {
	iv := NewInterview(s).(*Interview)
	iv.kind = timedCheckpoint
	return iv
}

func (iv *Interview) Title() string {
	if iv.kind == timedCheckpoint {
		return "check-in"
	}
	return "timed"
}

// Checkpoint check-ins stay on Today (like placement). Only mock interviews use Timed.
func (iv *Interview) Tab() int {
	if iv.kind == timedCheckpoint {
		return 0
	}
	return 2
}

func (iv *Interview) ceilings() []*catalog.Module {
	return checkpoint.CeilingModules(iv.s.App.Catalog)
}

func (iv *Interview) focusMode() progress.Mode {
	if iv.kind == timedCheckpoint {
		return progress.Checkpoint
	}
	return progress.Interview
}

func (iv *Interview) OwnsKey(k string) bool {
	switch iv.phase {
	case phaseRound:
		return k != "?"
	case phaseSelfCheck:
		return k != "?" && k != "q"
	case phaseSetup:
		switch k {
		case "1", "2", "3", "left", "right", "h", "l", "enter", "esc":
			return true
		}
		return false
	case phaseReveal:
		return k != "?" && k != "q"
	}
	return false
}

func (iv *Interview) Help() []string {
	if iv.kind == timedCheckpoint {
		return []string{
			"setup:  enter start the recommended checkpoint  esc back",
			"round:  e edit  t hint  tab next  space submit  q abandon",
			"after:  enter go back (we will refresh your plan)",
		}
	}
	return []string{
		"setup:  1-3 or ←/→ problems, enter to start",
		"round:  e edit  t hint (+3:00)  tab next  space submit  q abandon",
		"after:  1-4 tick the self-check, enter to reveal",
	}
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
	var problems []*catalog.Problem
	if iv.kind == timedCheckpoint {
		ceilings := iv.ceilings()
		if len(ceilings) == 0 {
			iv.s.Toast("no modules for a checkpoint")
			return nil
		}
		iv.through = ceilings[iv.ceilIdx].Number
		n := interview.CheckpointSize(iv.s.App.Catalog, iv.through)
		problems = interview.PickCheckpoint(iv.s.App.Catalog, iv.s.States(), iv.through, n, iv.s.Rand)
	} else {
		problems = iv.pick(iv.n)
	}
	if len(problems) == 0 {
		iv.s.Toast("no problems to pick from")
		return nil
	}
	iv.start = iv.s.App.Now()
	iv.since = iv.start
	iv.phase = phaseRound
	iv.done = make([]bool, len(problems))
	iv.passed = make([]bool, len(problems))
	iv.times = make([]time.Duration, len(problems))
	iv.spent = make([]time.Duration, len(problems))
	iv.outcomes = make([]checkpoint.Outcome, len(problems))
	iv.foci = nil
	mode := iv.focusMode()
	cmds := []tea.Cmd{iv.tick()}
	for _, p := range problems {
		f := newFocus(iv.s, p, mode)
		i := len(iv.foci)
		f.clock = func() time.Duration { return iv.elapsedOf(i) }
		iv.foci = append(iv.foci, f)
		cmds = append(cmds, f.Init())
	}
	return tea.Batch(cmds...)
}

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
	if iv.kind == timedCheckpoint {
		iv.outcomes[i] = checkpoint.Score(f.Green(), f.hints, false)
		f.elapsed = iv.times[i]
		switch iv.outcomes[i] {
		case checkpoint.OutcomeClean, checkpoint.OutcomeHinted:
			iv.passed[i] = true
			f.passed = true
			iv.s.Record(f.event(progress.Passed, map[string]string{"elapsed_ms": strconv.FormatInt(iv.times[i].Milliseconds(), 10)}))
		default:
			iv.s.Record(f.event(progress.GaveUp, nil))
		}
		return
	}
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
		if !iv.done[i] {
			if iv.kind == timedCheckpoint {
				iv.done[i] = true
				iv.outcomes[i] = checkpoint.OutcomeSkipped
				iv.times[i] = iv.elapsedOf(i)
				iv.s.Record(iv.foci[i].event(progress.Left, nil))
			} else {
				iv.submit(i)
			}
		}
		iv.foci[i].Close()
	}
	if iv.kind == timedCheckpoint {
		iv.persistCheckpoint()
		iv.phase = phaseReveal
		return
	}
	iv.phase = phaseSelfCheck
}

func (iv *Interview) persistCheckpoint() {
	results := make([]checkpoint.ItemResult, len(iv.foci))
	for i, f := range iv.foci {
		o := iv.outcomes[i]
		results[i] = checkpoint.ItemResult{
			Topic: f.p.Technique.Module.Title, ProblemID: f.p.ID,
			ModuleID: f.p.Technique.Module.ID, Outcome: o, Level: checkpoint.LevelOf(o),
		}
	}
	iv.s.Record(progress.Event{
		Time: iv.s.App.Now().UTC(), Kind: progress.CheckpointDone, Mode: progress.Checkpoint,
		Data: checkpoint.Encode(iv.through, results),
	})
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

func (iv *Interview) WantsMouse() bool { return iv.phase == phaseRound }

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
		if mm, ok := msg.(tea.MouseMsg); ok {
			if iv.phase != phaseRound {
				return iv, nil
			}
			// The round's status line sits one row above the focused problem's view.
			_, cmd := iv.foci[iv.cur].Update(shiftMouse(mm, -1))
			return iv, cmd
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
			if iv.kind == timedMock {
				iv.n, _ = strconv.Atoi(key)
			}
		case "left", "h":
			if iv.kind == timedMock {
				iv.n = max(iv.n-1, 1)
			}
		case "right", "l":
			if iv.kind == timedMock {
				iv.n = min(iv.n+1, 3)
			}
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
				if iv.kind == timedCheckpoint {
					return iv, nil // stay on reveal
				}
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
		case "t":
			// Interview: hint costs time. Checkpoint: hint scores as hinted, no clock penalty.
			if iv.kind == timedMock {
				_, cmd := iv.foci[iv.cur].Update(msg)
				return iv, cmd
			}
			f := iv.foci[iv.cur]
			if f.hints < len(f.hintList()) {
				f.hints++
				iv.s.Record(f.event(progress.HintRevealed, nil))
			}
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
		hint := "hint +3:00"
		if iv.kind == timedCheckpoint {
			hint = "hint"
		}
		return []ui.Key{{Key: "e", Label: "edit"}, {Key: "space", Label: "submit"}, {Key: "tab", Label: "next"}, {Key: "t", Label: hint}, {Key: "q", Label: "abandon"}}
	case phaseSelfCheck:
		return []ui.Key{{Key: "1-4", Label: "tick"}, {Key: "enter", Label: "reveal"}}
	case phaseReveal:
		return []ui.Key{{Key: "enter", Label: "done"}}
	}
	if iv.kind == timedCheckpoint {
		return []ui.Key{{Key: "enter", Label: "begin"}, {Key: "esc", Label: "back"}}
	}
	return []ui.Key{{Key: "1-3", Label: "problems"}, {Key: "enter", Label: "start"}}
}

func (iv *Interview) levelLabel(lv checkpoint.Level) string {
	th := iv.s.Theme
	switch lv {
	case checkpoint.LevelStrong:
		return th.Pass.Render("strong")
	case checkpoint.LevelShaky:
		return th.Due.Render("shaky")
	default:
		return th.Fail.Render("start here")
	}
}

func (iv *Interview) View(w, h int) string {
	th := iv.s.Theme
	cardW := w - 4
	switch iv.phase {
	case phaseSetup:
		if iv.kind == timedCheckpoint {
			ceilings := iv.ceilings()
			throughLabel := "your recent work"
			if len(ceilings) > 0 {
				throughLabel = ceilings[iv.ceilIdx].Title
			}
			body := strings.Join([]string{
				"This short check-in covers what you have been practicing through " + th.Accent.Render(throughLabel) + ".",
				"It is not an exam. It is a quick pulse check so we can keep your plan personal.",
				"You will see the module name, but the technique stays hidden. Hints are welcome.",
				"",
				th.Accent.Render("enter") + " begin the check-in    " + th.Muted.Render("esc") + " go back",
			}, "\n")
			return "\n" + strings.Join(indent(ui.Card(th, "practice check-in", body, cardW, true), 2), "\n")
		}
		pills := iv.choice(1) + " " + iv.choice(2) + " " + iv.choice(3)
		body := strings.Join([]string{
			"You will have 45 minutes. Treat it like a real interview: the module and technique stay hidden.",
			"Each hint costs three minutes. Please do not open the reference solution during the round.",
			"",
			"Number of problems  " + pills,
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
		label := fmt.Sprintf("  problem %d of %d", iv.cur+1, len(iv.foci))
		if iv.kind == timedCheckpoint {
			label = fmt.Sprintf("  %s · %d of %d", strings.ToLower(iv.foci[iv.cur].p.Technique.Module.Title), iv.cur+1, len(iv.foci))
		}
		left := "  " + strings.Join(steps, " ") + th.Muted.Render(label)
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
	// reveal
	if iv.kind == timedCheckpoint {
		results := make([]checkpoint.ItemResult, len(iv.foci))
		var rows []string
		for i, f := range iv.foci {
			o := iv.outcomes[i]
			lv := checkpoint.LevelOf(o)
			results[i] = checkpoint.ItemResult{
				Topic: f.p.Technique.Module.Title, ProblemID: f.p.ID,
				ModuleID: f.p.Technique.Module.ID, Outcome: o, Level: lv,
			}
			rows = append(rows, fmt.Sprintf("%-20s  %s", f.p.Technique.Module.Title, iv.levelLabel(lv)))
		}
		body := strings.Join(rows, "\n")
		if mod := checkpoint.Recommend(iv.s.App.Catalog, checkpoint.Result{Through: iv.through, Items: results}); mod != nil {
			body += "\n\n" + th.Muted.Render("Based on this check-in, we will emphasize ") + th.Accent.Render(strings.ToLower(mod.Title)) + th.Muted.Render(" in your plan.")
		} else {
			body += "\n\n" + th.Muted.Render("Nice work on that slice of the curriculum. Keep going, and we'll keep adapting your plan.")
		}
		title := "check-in results"
		if name := checkpoint.ModuleTitle(iv.s.App.Catalog, iv.through); name != "" {
			title = "check-in through " + name
		}
		return "\n" + strings.Join(indent(ui.Card(th, title, body, cardW, true), 2), "\n")
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
