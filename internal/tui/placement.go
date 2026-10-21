package tui

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/placement"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/tui/ui"
)

type placePhase int

const (
	placeIntro placePhase = iota
	placeRound
	placeReveal
)

type Placement struct {
	s        *Shared
	phase    placePhase
	slots    []placement.Slot
	items    []placement.Item
	foci     []*Focus
	cur      int
	done     []bool
	outcomes []placement.Outcome
	times    []time.Duration
	confirm  bool
	spent    []time.Duration
	since    time.Time
}

func NewPlacement(s *Shared) Screen {
	return &Placement{s: s, slots: placement.DefaultSlots}
}

// NewPlacementStart builds a Placement already in the round (Today is the intro).
func NewPlacementStart(s *Shared) (*Placement, tea.Cmd) {
	pl := &Placement{s: s, slots: placement.DefaultSlots}
	return pl, pl.begin()
}

func (pl *Placement) Title() string { return "placement" }

func (pl *Placement) Tab() int { return 0 }

func (pl *Placement) OwnsKey(k string) bool {
	switch pl.phase {
	case placeRound:
		return k != "?"
	case placeIntro, placeReveal:
		return k != "?" && k != "q"
	}
	return false
}

func (pl *Placement) Help() []string {
	return []string{
		"round:  e edit  t hint  space submit  n skip topic  q abandon",
		"after:  enter back to today",
	}
}

func (pl *Placement) elapsedOf(i int) time.Duration {
	d := pl.spent[i] + pl.foci[i].penalties
	if i == pl.cur && !pl.done[i] {
		d += pl.s.App.Now().Sub(pl.since)
	}
	return d
}

func (pl *Placement) begin() tea.Cmd {
	pl.items = placement.Resolve(pl.s.App.Catalog, pl.slots)
	if len(pl.items) == 0 {
		pl.s.Toast("no placement problems in this catalog")
		return nil
	}
	pl.phase = placeRound
	pl.since = pl.s.App.Now()
	pl.done = make([]bool, len(pl.items))
	pl.outcomes = make([]placement.Outcome, len(pl.items))
	pl.times = make([]time.Duration, len(pl.items))
	pl.spent = make([]time.Duration, len(pl.items))
	var cmds []tea.Cmd
	for _, it := range pl.items {
		f := newFocus(pl.s, it.Problem, progress.Placement)
		i := len(pl.foci)
		f.clock = func() time.Duration { return pl.elapsedOf(i) }
		pl.foci = append(pl.foci, f)
		cmds = append(cmds, f.Init())
	}
	return tea.Batch(cmds...)
}

func (pl *Placement) switchTo(i int) {
	now := pl.s.App.Now()
	if !pl.done[pl.cur] {
		pl.spent[pl.cur] += now.Sub(pl.since)
	}
	pl.cur, pl.since = i, now
}

func (pl *Placement) submit(i int, skipped bool) {
	if pl.done[i] {
		return
	}
	f := pl.foci[i]
	pl.times[i] = pl.elapsedOf(i)
	if i == pl.cur {
		pl.spent[i] += pl.s.App.Now().Sub(pl.since)
		pl.since = pl.s.App.Now()
	}
	pl.done[i] = true
	pl.outcomes[i] = placement.Score(f.Green() && !skipped, f.hints, skipped, pl.times[i] > f.p.TimeTarget)
	f.elapsed = pl.times[i]
	switch pl.outcomes[i] {
	case placement.OutcomeClean, placement.OutcomeHinted:
		f.passed = true
		pl.s.Record(f.event(progress.Passed, map[string]string{"elapsed_ms": strconv.FormatInt(pl.times[i].Milliseconds(), 10)}))
	case placement.OutcomeSkipped:
		pl.s.Record(f.event(progress.Left, nil))
	default:
		pl.s.Record(f.event(progress.GaveUp, nil))
	}
}

func (pl *Placement) allDone() bool {
	for _, d := range pl.done {
		if !d {
			return false
		}
	}
	return true
}

func (pl *Placement) finish() {
	for i := range pl.foci {
		if !pl.done[i] {
			pl.submit(i, true)
		}
		pl.foci[i].Close()
	}
	results := make([]placement.ItemResult, len(pl.items))
	for i, it := range pl.items {
		o := pl.outcomes[i]
		results[i] = placement.ItemResult{
			Topic: it.Topic, ProblemID: it.Problem.ID, ModuleID: it.Problem.Technique.Module.ID,
			Outcome: o, Level: placement.LevelOf(o),
		}
	}
	pl.s.Record(progress.Event{
		Time: pl.s.App.Now().UTC(), Kind: progress.PlacementDone, Mode: progress.Placement,
		Data: placement.Encode(results),
	})
	pl.phase = placeReveal
}

func (pl *Placement) skipAll() {
	pl.s.Record(progress.Event{
		Time: pl.s.App.Now().UTC(), Kind: progress.PlacementDone, Mode: progress.Placement,
		Data: map[string]string{"skipped": "1"},
	})
}

func (pl *Placement) Close() {
	if pl.phase == placeRound {
		pl.finish()
	}
}

func (pl *Placement) Update(msg tea.Msg) (Screen, tea.Cmd) {
	k, isKey := msg.(tea.KeyPressMsg)
	if !isKey {
		var cmds []tea.Cmd
		for _, f := range pl.foci {
			_, cmd := f.Update(msg)
			cmds = append(cmds, cmd)
		}
		return pl, tea.Batch(cmds...)
	}
	key := k.String()
	switch pl.phase {
	case placeIntro:
		switch key {
		case "enter":
			return pl, pl.begin()
		case "n", "esc":
			pl.skipAll()
			return pl, pop
		}
	case placeRound:
		if pl.confirm {
			pl.confirm = false
			if key == "y" {
				pl.finish()
				return pl, nil
			}
			return pl, nil
		}
		switch key {
		case "q":
			pl.confirm = true
		case "n":
			pl.submit(pl.cur, true)
			if pl.allDone() {
				pl.finish()
				return pl, nil
			}
			next := pl.cur
			for pl.done[next] {
				next = (next + 1) % len(pl.foci)
			}
			pl.switchTo(next)
		case "space":
			pl.submit(pl.cur, false)
			if pl.allDone() {
				pl.finish()
				return pl, nil
			}
			next := pl.cur
			for pl.done[next] {
				next = (next + 1) % len(pl.foci)
			}
			pl.switchTo(next)
		case "esc", "g", "s", "/":
		default:
			_, cmd := pl.foci[pl.cur].Update(msg)
			return pl, cmd
		}
	case placeReveal:
		if key == "enter" || key == "esc" {
			pl.toastHandoff()
			return pl, pop
		}
	}
	return pl, nil
}

func (pl *Placement) toastHandoff() {
	if len(pl.items) == 0 {
		pl.s.Toast("Your practice plan is ready")
		return
	}
	results := make([]placement.ItemResult, len(pl.items))
	for i, it := range pl.items {
		o := pl.outcomes[i]
		results[i] = placement.ItemResult{
			Topic: it.Topic, ProblemID: it.Problem.ID, ModuleID: it.Problem.Technique.Module.ID,
			Outcome: o, Level: placement.LevelOf(o),
		}
	}
	if mod := placement.Recommend(pl.s.App.Catalog, placement.Result{Items: results}); mod != nil {
		pl.s.Toast("We will start your plan with " + strings.ToLower(mod.Title))
		return
	}
	pl.s.Toast("Your practice plan is ready")
}

func (pl *Placement) Keys() []ui.Key {
	switch pl.phase {
	case placeRound:
		return []ui.Key{
			{Key: "e", Label: "edit"}, {Key: "space", Label: "submit"},
			{Key: "n", Label: "skip"}, {Key: "t", Label: "hint"}, {Key: "q", Label: "abandon"},
		}
	case placeReveal:
		return []ui.Key{{Key: "enter", Label: "back to today"}}
	}
	return []ui.Key{{Key: "enter", Label: "begin"}, {Key: "n", Label: "skip for now"}}
}

func (pl *Placement) levelLabel(lv placement.Level) string {
	th := pl.s.Theme
	switch lv {
	case placement.LevelStrong:
		return th.Pass.Render("strong")
	case placement.LevelShaky:
		return th.Due.Render("shaky")
	default:
		return th.Fail.Render("start here")
	}
}

func (pl *Placement) View(w, h int) string {
	th := pl.s.Theme
	cardW := w - 4
	switch pl.phase {
	case placeIntro:
		body := strings.Join([]string{
			"We will walk you through a few easy problems with interview-style timers.",
			"You will see one each from arrays, two pointers, trees, graphs, and binary search.",
			"Each has a timer (usually 15 minutes). Going over or using a hint counts as shaky.",
			"Skip any topic you want.",
			"",
			th.Accent.Render("enter") + " begin the warm-up    " + th.Accent.Render("n") + " skip for now",
		}, "\n")
		return "\n" + strings.Join(indent(ui.Card(th, "placement warm-up", body, cardW, true), 2), "\n")
	case placeRound:
		if pl.confirm {
			return ui.Modal(th, "finish early?", "We will skip the problems you have not finished and use what you have already done.\n\n"+
				th.Accent.Render("y")+" finish early    "+th.Accent.Render("n")+" keep going", w, h)
		}
		var steps []string
		for i := range pl.foci {
			switch {
			case pl.done[i]:
				steps = append(steps, th.Pass.Render("●"))
			case i == pl.cur:
				steps = append(steps, th.Accent.Render("●"))
			default:
				steps = append(steps, th.Muted.Render("○"))
			}
		}
		topic := pl.items[pl.cur].Topic
		left := "  " + strings.Join(steps, " ") + th.Muted.Render(fmt.Sprintf("  %s · %d of %d", topic, pl.cur+1, len(pl.foci)))
		return strings.Join(append([]string{"", left}, strings.Split(pl.foci[pl.cur].View(w, h-2), "\n")[1:]...), "\n")
	}
	// reveal
	results := make([]placement.ItemResult, len(pl.items))
	for i, it := range pl.items {
		o := pl.outcomes[i]
		results[i] = placement.ItemResult{
			Topic: it.Topic, ProblemID: it.Problem.ID, ModuleID: it.Problem.Technique.Module.ID,
			Outcome: o, Level: placement.LevelOf(o),
		}
	}
	var rows []string
	for _, it := range results {
		rows = append(rows, fmt.Sprintf("%-18s  %s", it.Topic, pl.levelLabel(it.Level)))
	}
	body := strings.Join(rows, "\n")
	if mod := placement.Recommend(pl.s.App.Catalog, placement.Result{Items: results}); mod != nil {
		body += "\n\n" + th.Muted.Render("Great work. We recommend starting with ") + th.Accent.Render(strings.ToLower(mod.Title)) + th.Muted.Render(".")
		body += "\n" + th.Muted.Render("We will put those topics first in your practice plan.")
	} else {
		body += "\n\n" + th.Muted.Render("You look solid across these topics. Explore the map when you are ready,")
		body += "\n" + th.Muted.Render("and we will keep adapting your plan as you practice.")
	}
	return "\n" + strings.Join(indent(ui.Card(th, "your placement results", body, cardW, true), 2), "\n")
}
