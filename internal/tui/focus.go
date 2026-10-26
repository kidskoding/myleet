package tui

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/editor"
	"github.com/kidskoding/myleet/internal/interview"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/tui/ui"
	"github.com/kidskoding/myleet/internal/workspace"
)

const watchDebounce = 150 * time.Millisecond

type pane int

const (
	panePrompt pane = iota
	paneSolution
	paneDiff
)

type window int

const (
	winProblem window = iota
	winTests
	windowCount
)

type (
	runDoneMsg struct {
		f      *Focus
		res    runner.Result
		logged bool
		seq    int
	}
	fileChangedMsg struct{ f *Focus }
	editorDoneMsg  struct {
		f   *Focus
		err error
	}
	focusTickMsg struct{ f *Focus }
	spinMsg      struct{ f *Focus }
	promptMsg    struct {
		f   *Focus
		res prompt.Result
	}
)

type Focus struct {
	s       *Shared
	p       *catalog.Problem
	mode    progress.Mode
	attempt string
	start   time.Time
	path    string

	last           runner.Result
	ran            bool
	running        bool
	green          bool
	passed         bool
	elapsed        time.Duration
	banner         string
	hints          int
	peeked         bool
	gaveUp         bool
	timeUp         bool
	closed         bool
	confirm        bool
	pausedAt       time.Time
	pausedFor      time.Duration
	restarted      bool
	confirmRestart bool
	checked        []bool
	pane           pane
	paneText       string
	scroll         int
	win            window
	zoom           bool
	testsTop       int
	rows           [windowCount]int
	winY           [windowCount][2]int
	shown          [windowCount][]string
	err            string
	cancel         context.CancelFunc
	watchCh        <-chan struct{}
	penalties      time.Duration
	statement      string
	stmtState      prompt.Status
	baseline       []byte               // attempt content when the attempt started
	clock          func() time.Duration // interview rounds time each problem separately
	seq            int
	frame          int
	fnName         string
}

func NewFocus(s *Shared, p *catalog.Problem, mode progress.Mode) Screen {
	return newFocus(s, p, mode)
}

func newFocus(s *Shared, p *catalog.Problem, mode progress.Mode) *Focus {
	return &Focus{s: s, p: p, mode: mode, attempt: progress.NewAttemptID(), checked: make([]bool, len(p.SayAloud))}
}

func (f *Focus) examMode() bool {
	return f.mode == progress.Interview || f.mode == progress.Placement || f.mode == progress.Checkpoint
}

// practiceLike is open practice or a keep-sharp drill (hints, solution, give-up).
func (f *Focus) practiceLike() bool {
	return f.mode == progress.Practice || f.mode == progress.Drill
}

func (f *Focus) Title() string {
	switch f.mode {
	case progress.Interview:
		return "timed"
	case progress.Placement:
		return "placement"
	case progress.Checkpoint:
		return "check-in"
	case progress.Drill:
		return "drill"
	}
	return f.p.Title
}

func (f *Focus) event(kind progress.Kind, data map[string]string) progress.Event {
	return progress.Event{Time: f.s.App.Now().UTC(), Kind: kind, Problem: f.p.ID, Attempt: f.attempt, Mode: f.mode, Data: data}
}

func (f *Focus) Init() tea.Cmd {
	f.start = f.s.App.Now()
	path, err := f.s.App.Workspace.Ensure(f.p)
	if err != nil {
		f.err = err.Error()
		return nil
	}
	f.path = path
	if f.shouldStartCold() {
		if f.edited() {
			_, _ = f.s.App.Workspace.Snapshot(f.p.ID, f.s.App.Now())
		}
		if err := f.s.App.Workspace.Reset(f.p); err != nil {
			f.err = err.Error()
		}
	}
	f.baseline, _ = os.ReadFile(path)
	f.fnName = solvedName(f.p.StarterPath())
	f.s.Record(f.event(progress.Opened, nil))
	cmds := []tea.Cmd{f.run(false), f.tick(), f.fetchPrompt()}
	if f.s.Watch != nil {
		ctx, cancel := context.WithCancel(context.Background())
		f.cancel = cancel
		if ch, err := f.s.Watch(ctx, path, watchDebounce); err == nil {
			f.watchCh = ch
			cmds = append(cmds, f.waitForChange())
		}
	}
	return tea.Batch(cmds...)
}

// shouldStartCold: otherwise a review would reopen yesterday's passing solution.
// Work edited after the last finished attempt is unfinished, so it is kept.
func (f *Focus) shouldStartCold() bool {
	if f.examMode() {
		return true
	}
	st := statusOf(f.s.States(), f.p.ID)
	if st.Rung < 0 {
		return false
	}
	info, err := os.Stat(f.path)
	return err != nil || !info.ModTime().After(st.LastFinished)
}

func (f *Focus) run(logged bool) tea.Cmd {
	if f.path == "" {
		return nil
	}
	// An unedited file proves nothing, so its runs never count toward the ladder.
	if current, err := os.ReadFile(f.path); err == nil && bytes.Equal(current, f.baseline) {
		logged = false
	}
	alreadySpinning := f.running
	f.running = true
	f.seq++
	seq, runnerImpl, test, code := f.seq, f.s.Runner, f.p.TestPath(), f.path
	run := func() tea.Msg {
		return runDoneMsg{f: f, res: runnerImpl.Run(context.Background(), test, code), logged: logged, seq: seq}
	}
	if alreadySpinning {
		return run
	}
	return tea.Batch(run, f.spin())
}

func (f *Focus) spin() tea.Cmd {
	if f.s.Spin == nil {
		return nil
	}
	t := f.s.Spin()
	return func() tea.Msg { t(); return spinMsg{f} }
}

func (f *Focus) fetchPrompt() tea.Cmd {
	if f.s.Prompts == nil {
		return nil
	}
	src, p := f.s.Prompts, f.p
	return func() tea.Msg { return promptMsg{f: f, res: src.Get(context.Background(), p)} }
}

// The key idea names the approach, so it is only offered as the last hint, and
// never in interviews.
func (f *Focus) hintList() []string {
	if f.p.KeyIdea == "" || f.examMode() {
		return f.p.Hints
	}
	return append(append([]string{}, f.p.Hints...), "key idea: "+f.p.KeyIdea)
}

func (f *Focus) tick() tea.Cmd {
	t := f.s.Tick()
	if t == nil {
		return nil
	}
	return func() tea.Msg { t(); return focusTickMsg{f} }
}

func (f *Focus) waitForChange() tea.Cmd {
	ch := f.watchCh
	if ch == nil {
		return nil
	}
	return func() tea.Msg {
		if _, ok := <-ch; !ok {
			return nil
		}
		return fileChangedMsg{f}
	}
}

// Interview rounds record their own outcomes, so Close only records "left" in practice.
func (f *Focus) Close() {
	if f.closed {
		return
	}
	f.closed = true
	if f.cancel != nil {
		f.cancel()
	}
	if f.path != "" && f.edited() {
		_, _ = f.s.App.Workspace.Snapshot(f.p.ID, f.s.App.Now())
	}
	if f.practiceLike() && !f.gaveUp && !f.passed && f.path != "" {
		f.s.Record(f.event(progress.Left, nil))
	}
}

func (f *Focus) edited() bool {
	attempt, err1 := os.ReadFile(f.path)
	starter, err2 := os.ReadFile(f.p.StarterPath())
	return err1 != nil || err2 != nil || !bytes.Equal(attempt, starter)
}

func (f *Focus) Elapsed() time.Duration {
	if f.passed || f.timeUp {
		return f.elapsed
	}
	if f.clock != nil {
		return f.clock()
	}
	now := f.s.App.Now()
	if f.paused() {
		now = f.pausedAt
	}
	return now.Sub(f.start) - f.pausedFor + f.penalties
}

func (f *Focus) paused() bool { return !f.pausedAt.IsZero() }

// Exams keep a real interview clock.
func (f *Focus) canPause() bool { return f.practiceLike() && !f.passed && !f.gaveUp }

func (f *Focus) togglePause() tea.Cmd {
	now := f.s.App.Now()
	if !f.paused() {
		f.pausedAt = now
		return nil
	}
	f.pausedFor += now.Sub(f.pausedAt)
	f.pausedAt = time.Time{}
	return f.run(true) // pick up anything saved while paused
}

// expire ends a practice attempt at its time target, so work past it cannot pass.
func (f *Focus) expire() {
	if f.timeUp || !f.practiceLike() || f.passed || f.gaveUp || f.paused() || f.Elapsed() < f.p.TimeTarget {
		return
	}
	f.timeUp, f.gaveUp, f.elapsed = true, true, f.p.TimeTarget
	f.confirm, f.confirmRestart = false, false
	f.s.Record(f.event(progress.GaveUp, map[string]string{"reason": "time_up"}))
	if f.mode == progress.Drill {
		f.banner = "time's up · review schedule unchanged"
		return
	}
	f.banner = "time's up · " + mmss(f.p.TimeTarget) + " reached · back to 1d · next " + dateLabel(statusOf(f.s.States(), f.p.ID).Due)
}

func (f *Focus) restartTimer() {
	f.start, f.pausedFor, f.pausedAt = f.s.App.Now(), 0, time.Time{}
	f.restarted = true
	f.s.Record(f.event(progress.TimerRestarted, nil))
}

func (f *Focus) Green() bool { return f.green }

func (f *Focus) Update(msg tea.Msg) (Screen, tea.Cmd) {
	f.expire()
	switch msg := msg.(type) {
	case runDoneMsg:
		if msg.f != f || f.closed || msg.seq != f.seq {
			return f, nil // a newer run is in flight; this result is stale
		}
		return f, f.finishRun(msg.res, msg.logged)
	case fileChangedMsg:
		if msg.f != f || f.closed {
			return f, nil
		}
		if f.paused() || f.timeUp {
			return f, f.waitForChange() // resuming reruns, so a paused save cannot pass
		}
		return f, tea.Batch(f.run(true), f.waitForChange())
	case editorDoneMsg:
		if msg.f != f || f.closed {
			return f, nil
		}
		if msg.err != nil {
			f.err = "editor: " + msg.err.Error()
		}
		if f.paused() || f.timeUp {
			return f, nil
		}
		return f, f.run(true)
	case promptMsg:
		if msg.f == f {
			f.statement, f.stmtState = msg.res.Markdown, msg.res.Status
		}
		return f, nil
	case spinMsg:
		if msg.f != f || f.closed {
			return f, nil
		}
		f.frame++
		if f.running {
			return f, f.spin()
		}
		return f, nil
	case focusTickMsg:
		if msg.f != f || f.closed {
			return f, nil
		}
		return f, f.tick()
	case tea.KeyPressMsg:
		return f.handleKey(msg.String())
	case tea.MouseWheelMsg:
		if w, ok := f.windowAt(msg.Y); ok {
			switch msg.Button {
			case tea.MouseWheelUp:
				f.scrollWindow(w, -3)
			case tea.MouseWheelDown:
				f.scrollWindow(w, 3)
			}
		}
	case tea.MouseClickMsg:
		if w, ok := f.windowAt(msg.Y); ok && msg.Button == tea.MouseLeft {
			f.win = w
		}
	}
	return f, nil
}

func (f *Focus) WantsMouse() bool { return !f.confirm }

func (f *Focus) windowAt(y int) (window, bool) {
	for w := range windowCount {
		if r := f.winY[w]; y >= r[0] && y < r[1] {
			return w, true
		}
	}
	return 0, false
}

func (f *Focus) finishRun(res runner.Result, logged bool) tea.Cmd {
	f.running, f.ran, f.last = false, true, res
	f.testsTop = 0
	f.green = res.Green()
	if logged {
		f.s.Record(f.event(progress.TestRun, map[string]string{"passed": strconv.Itoa(res.Passed), "total": strconv.Itoa(res.Total)}))
	}
	if f.green {
		_, _ = f.s.App.Workspace.Snapshot(f.p.ID, f.s.App.Now())
	}
	if f.green && logged && !f.passed && !f.timeUp && !f.examMode() {
		f.recordPass()
	}
	return nil
}

func (f *Focus) recordPass() {
	before := statusOf(f.s.States(), f.p.ID)
	f.elapsed = f.Elapsed()
	f.passed = true
	f.s.Record(f.event(progress.Passed, map[string]string{"elapsed_ms": strconv.FormatInt(f.elapsed.Milliseconds(), 10)}))
	after := statusOf(f.s.States(), f.p.ID)
	f.banner = f.bannerText(before, after)
}

func (f *Focus) bannerText(before, after schedule.State) string {
	var att schedule.Attempt
	for _, a := range f.s.App.Attempts() {
		if a.ID == f.attempt {
			att = a
		}
	}
	if f.mode == progress.Drill {
		switch {
		case att.Peeks > 0:
			return "drill complete (solution peeked) · review schedule unchanged"
		case att.Hints > 0:
			return "drill complete (hint used) · review schedule unchanged"
		case att.Restarts > 0:
			return "drill complete (timer restarted) · review schedule unchanged"
		case !att.Clean:
			return "drill complete · review schedule unchanged"
		default:
			return "sharp · review schedule unchanged · next due " + dateLabel(after.Due)
		}
	}
	next := "next " + dateLabel(after.Due)
	switch {
	case att.Peeks > 0:
		return "passed (solution peeked) · back to 1d · " + next
	case att.Hints > 0:
		return "passed (hint used) · back to 1d · " + next
	case att.Restarts > 0:
		return "passed (timer restarted) · back to 1d · " + next
	case !att.Clean:
		return fmt.Sprintf("passed (over %s) · back to 1d · %s", f.p.TimeTarget, next)
	case before.Rung < 0:
		return "first pass · " + next
	case after.Rung > before.Rung:
		return fmt.Sprintf("clean pass · %dd → %dd · %s", schedule.Rungs[before.Rung], schedule.Rungs[after.Rung], next)
	default:
		return "clean pass · same day, no climb · " + next
	}
}

func (f *Focus) handleKey(k string) (Screen, tea.Cmd) {
	if f.confirmRestart {
		f.confirmRestart = false
		if k == "y" {
			f.restartTimer()
		}
		return f, nil
	}
	if f.paused() {
		switch k {
		case "p":
			return f, f.togglePause()
		case "R":
			f.confirmRestart = true
		case "esc":
			return f, pop
		}
		return f, nil
	}
	if f.timeUp {
		switch k {
		case "e", "space", "t", "p", "R", "r", "g":
			return f, nil
		}
	}
	if f.confirm {
		f.confirm = false
		if k == "y" {
			if err := f.s.App.Workspace.Reset(f.p); err != nil {
				f.err = err.Error()
			}
			f.s.Record(f.event(progress.Reset, nil))
			return f, f.run(false)
		}
		return f, nil
	}
	switch k {
	case "p":
		if f.canPause() {
			return f, f.togglePause()
		}
	case "R":
		if f.canPause() {
			f.confirmRestart = true
		}
	case "e":
		cmd, err := editor.Command(f.s.App.Config, f.path)
		if err != nil {
			f.err = err.Error()
			return f, nil
		}
		return f, tea.ExecProcess(cmd, func(err error) tea.Msg { return editorDoneMsg{f, err} })
	case "space":
		return f, f.run(true)
	case "t":
		if f.hints < len(f.hintList()) {
			f.hints++
			var data map[string]string
			if f.mode == progress.Interview {
				f.penalties += interview.HintPenalty
				data = map[string]string{"penalty_ms": strconv.FormatInt(interview.HintPenalty.Milliseconds(), 10)}
			}
			f.s.Record(f.event(progress.HintRevealed, data))
		}
	case "s":
		if f.p.HasSolution && f.practiceLike() {
			f.togglePane(paneSolution)
		}
	case "d":
		f.togglePane(paneDiff)
	case "o":
		if f.p.URL != "" {
			if err := f.s.Open(f.p.URL); err != nil {
				f.err = err.Error()
			}
		}
	case "r":
		f.confirm = true
	case "g":
		if f.practiceLike() && !f.passed {
			f.gaveUp = true
			f.s.Record(f.event(progress.GaveUp, nil))
			return f, pop
		}
	case "tab", "w":
		f.win = (f.win + 1) % windowCount
	case "shift+tab":
		f.win = (f.win + windowCount - 1) % windowCount
	case "z":
		f.zoom = !f.zoom
	case "y":
		name := map[window]string{winProblem: "problem", winTests: "test output"}[f.win]
		text := strings.TrimRight(ansi.Strip(strings.Join(f.shown[f.win], "\n")), "\n ")
		f.s.Toast("copied " + name)
		return f, tea.SetClipboard(text)
	case "j", "down":
		f.scrollBy(1)
	case "k", "up":
		f.scrollBy(-1)
	case "pgdown", "ctrl+d":
		f.scrollBy(max(f.rows[f.win]/2, 1))
	case "pgup", "ctrl+u":
		f.scrollBy(-max(f.rows[f.win]/2, 1))
	case "home":
		f.scrollBy(-1 << 30)
	case "end":
		f.scrollBy(1 << 30) // clamped to the last page when drawn
	case "esc":
		if f.zoom {
			f.zoom = false
			return f, nil
		}
		if f.pane != panePrompt {
			f.pane, f.scroll = panePrompt, 0
			return f, nil
		}
		return f, pop
	default:
		if n, err := strconv.Atoi(k); err == nil && n >= 1 && n <= len(f.checked) {
			f.checked[n-1] = !f.checked[n-1]
			if f.checked[n-1] {
				f.s.Record(f.event(progress.SayAloudChecked, map[string]string{"item": f.p.SayAloud[n-1]}))
			}
		}
	}
	return f, nil
}

func (f *Focus) scrollBy(n int) { f.scrollWindow(f.win, n) }

func (f *Focus) scrollWindow(w window, n int) {
	top := &f.scroll
	if w == winTests {
		top = &f.testsTop
	}
	*top = max(*top+n, 0)
}

func (f *Focus) togglePane(p pane) {
	f.win = winProblem
	if f.pane == p {
		f.pane, f.scroll = panePrompt, 0
		return
	}
	f.pane, f.scroll = p, 0
	switch p {
	case paneSolution:
		data, err := os.ReadFile(f.p.SolutionPath())
		if err != nil {
			f.paneText = err.Error()
			return
		}
		f.paneText = string(data)
		if !f.peeked {
			f.peeked = true
			f.s.Record(f.event(progress.SolutionPeeked, nil))
		}
	case paneDiff:
		previous := f.previousVersion()
		if previous == "" {
			f.paneText = "no earlier attempt"
			return
		}
		d, err := workspace.Diff(previous, f.path)
		switch {
		case err != nil:
			f.paneText = err.Error()
		case d == "":
			f.paneText = "no changes since the last snapshot"
		default:
			f.paneText = d
		}
	}
}

func (f *Focus) previousVersion() string {
	current, _ := os.ReadFile(f.path)
	snaps, _ := f.s.App.Workspace.Snapshots(f.p.ID)
	for i := len(snaps) - 1; i >= 0; i-- {
		if data, err := os.ReadFile(snaps[i]); err == nil && !bytes.Equal(data, current) {
			return snaps[i]
		}
	}
	return ""
}

// OwnsKey: while a confirm prompt is open, q must answer it rather than quit.
func (f *Focus) OwnsKey(string) bool { return f.confirm || f.confirmRestart }

func (f *Focus) Help() []string {
	return []string{"e      edit in $EDITOR (tests rerun on save)", "space  rerun tests", "t      reveal next hint",
		"s      show reference solution", "d      diff against your last attempt", "o      open problem page",
		"r      reset attempt to starter", "p      pause / resume the clock (practice; hides the problem)",
		"R      restart the clock (practice; the pass will not count as clean)", "1-3    tick say-it-out-loud items", "g      give up",
		"       at the time target the attempt ends and counts as a miss (practice)",
		"tab/w  switch between problem and tests", "↑/↓    scroll the focused window", "pgup/pgdn  page · home/end  top/bottom",
		"z      zoom the focused window", "y      copy the focused window", "mouse  wheel scrolls, click focuses a window", "esc    unzoom, close a pane, or back"}
}

func (f *Focus) paneLines(w int) []string {
	th := f.s.Theme
	switch f.pane {
	case paneSolution:
		return strings.Split(strings.TrimRight(f.paneText, "\n"), "\n")
	case paneDiff:
		var lines []string
		for _, l := range strings.Split(strings.TrimRight(f.paneText, "\n"), "\n") {
			switch {
			case strings.HasPrefix(l, "+") && !strings.HasPrefix(l, "+++"):
				l = th.Pass.Render(l)
			case strings.HasPrefix(l, "-") && !strings.HasPrefix(l, "---"):
				l = th.Fail.Render(l)
			}
			lines = append(lines, l)
		}
		return lines
	}
	md := f.statement
	if md == "" {
		var b strings.Builder
		switch f.stmtState {
		case "":
			b.WriteString("_fetching statement…_\n\n")
		case prompt.Premium:
			b.WriteString("_This problem is premium on LeetCode, so its statement is not public. Press o to open it._\n\n")
		case prompt.Offline:
			b.WriteString("_Offline: couldn't reach LeetCode for the statement. Press o to open it in the browser._\n\n")
		}
		if f.p.URL != "" {
			b.WriteString("Problem page: " + f.p.URL + " (press o)\n")
		}
		md = b.String()
	}
	lines := strings.Split(renderMarkdown(md, w), "\n")
	hints := f.hintList()
	for i := 0; i < f.hints && i < len(hints); i++ {
		lines = append(lines, "", th.Due.Render(fmt.Sprintf("hint %d: ", i+1))+hints[i])
	}
	return lines
}

func lastErrorLine(out string) string {
	if strings.TrimSpace(out) == "" {
		return ""
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.Contains(lines[i], "Error") {
			return strings.TrimSpace(lines[i])
		}
	}
	return lines[len(lines)-1]
}

var defRE = regexp.MustCompile(`(?m)^(?:def|class) (\w+)`)

// solvedName is the starter's last top-level def or class; support classes come first.
func solvedName(starter string) string {
	data, err := os.ReadFile(starter)
	if err != nil {
		return ""
	}
	matches := defRE.FindAllStringSubmatch(string(data), -1)
	if len(matches) == 0 {
		return ""
	}
	return matches[len(matches)-1][1]
}

func testLabel(fn, test string) string {
	name := strings.TrimPrefix(test, "test_")
	if prefix := strings.ToLower(fn); prefix != "" {
		if name == prefix {
			return strings.ReplaceAll(name, "_", " ")
		}
		name = strings.TrimPrefix(name, prefix+"_")
	}
	return strings.ReplaceAll(name, "_", " ")
}

func (f *Focus) Keys() []ui.Key {
	if f.confirm || f.confirmRestart {
		return []ui.Key{{Key: "y", Label: "yes"}, {Key: "n", Label: "cancel"}}
	}
	if f.paused() {
		return []ui.Key{{Key: "p", Label: "resume"}, {Key: "R", Label: "restart timer"}, {Key: "esc", Label: "back"}}
	}
	if f.timeUp {
		var keys []ui.Key
		if f.p.HasSolution {
			keys = append(keys, ui.Key{Key: "s", Label: "solution"})
		}
		keys = append(keys, ui.Key{Key: "d", Label: "diff"}, ui.Key{Key: "tab", Label: "window"}, ui.Key{Key: "z", Label: "zoom"},
			ui.Key{Key: "y", Label: "copy"})
		if f.p.URL != "" {
			keys = append(keys, ui.Key{Key: "o", Label: "leetcode"})
		}
		return append(keys, ui.Key{Key: "esc", Label: "back"})
	}
	keys := []ui.Key{{Key: "e", Label: "edit"}, {Key: "space", Label: "rerun"}}
	if f.canPause() {
		keys = append(keys, ui.Key{Key: "p", Label: "pause"})
	}
	if hints := f.hintList(); f.hints < len(hints) {
		keys = append(keys, ui.Key{Key: "t", Label: fmt.Sprintf("hint %d/%d", f.hints+1, len(hints))})
	}
	if f.p.SolutionPath() != "" {
		if _, err := os.Stat(f.p.SolutionPath()); err == nil {
			keys = append(keys, ui.Key{Key: "s", Label: "solution"})
		}
	}
	keys = append(keys, ui.Key{Key: "tab", Label: "window"}, ui.Key{Key: "z", Label: "zoom"},
		ui.Key{Key: "y", Label: "copy"}, ui.Key{Key: "d", Label: "diff"})
	if f.p.URL != "" {
		keys = append(keys, ui.Key{Key: "o", Label: "leetcode"})
	}
	return append(keys, ui.Key{Key: "esc", Label: "back"})
}

func (f *Focus) header(w int) string {
	th := f.s.Theme
	where := "??? hidden"
	switch {
	case f.mode == progress.Checkpoint:
		where = strings.ToLower(f.p.Technique.Module.Title) + " · ???"
	case f.mode == progress.Drill:
		where = "keep sharp · " + strings.ToLower(f.p.Technique.Title)
	case !f.examMode():
		where = strings.ToLower(f.p.Technique.Module.Title + " · " + f.p.Technique.Title)
	}
	right := "  " + difficultyBadge(th, f.p.Difficulty) + "  " + th.Muted.Render(where)
	title := ui.Truncate(f.p.Title, max(w-4-lipgloss.Width(right), 8))
	return ui.Truncate("  "+th.Title.Render(title)+right, w)
}

func (f *Focus) timerTone() ui.Tone {
	switch elapsed := f.Elapsed(); {
	case elapsed > f.p.TimeTarget:
		return ui.ToneFail
	case elapsed*5 >= f.p.TimeTarget*4:
		return ui.ToneDue
	}
	return ui.ToneMuted
}

func (f *Focus) testGlyphs() (lines []string, dots string) {
	th := f.s.Theme
	res := f.last
	for _, t := range res.Tests {
		glyph, label := th.Muted.Render("○"), testLabel(f.fnName, t.Name)
		switch {
		case t.Outcome == runner.Passed:
			glyph = th.Pass.Render("✓")
			dots += th.Pass.Render("●")
		case res.NotStarted:
			dots += th.Muted.Render("○")
		default:
			glyph = th.Fail.Render("✗")
			dots += th.Fail.Render("✗")
		}
		lines = append(lines, glyph+" "+label)
	}
	return lines, dots
}

func (f *Focus) testStatus() string {
	th := f.s.Theme
	res := f.last
	switch {
	case f.running:
		return th.Accent.Render(ui.SpinnerFrame(f.frame)) + " running"
	case f.err != "":
		return th.Fail.Render(f.err)
	case !f.ran:
		return th.Muted.Render("waiting")
	case res.Err != nil:
		return th.Fail.Render("could not run")
	case res.TimedOut:
		return th.Fail.Render("timed out")
	case res.NotStarted:
		return fmt.Sprintf("%d/%d", res.Passed, res.Total) + th.Muted.Render(" · not started")
	}
	return fmt.Sprintf("%d/%d", res.Passed, res.Total)
}

func (f *Focus) sidebar(width, height int) string {
	th := f.s.Theme
	inner := width - 4
	_, dots := f.testGlyphs()
	body := []string{
		ui.Bar(th, float64(f.Elapsed())/float64(max(f.p.TimeTarget, time.Second)), inner, f.timerTone()),
		"",
		th.Muted.Render("tests ") + f.testStatus(),
		dots,
		"", th.Muted.Render("say it aloud"),
	}
	for i, item := range f.p.SayAloud {
		box := th.Muted.Render("[ ]")
		if f.checked[i] {
			box = th.Pass.Render("[x]")
		}
		body = append(body, box+" "+item)
	}
	body = padLines(body, height-2)
	title := mmss(f.Elapsed()) + " / " + mmss(f.p.TimeTarget)
	return ui.Card(th, title, strings.Join(body[:max(height-2, 0)], "\n"), width, false)
}

func (f *Focus) checklistLines(width int) []string {
	th := f.s.Theme
	sep := th.Border.Render(" · ")
	lines := []string{th.Muted.Render("say it aloud ")}
	fresh := true
	for i, item := range f.p.SayAloud {
		box := th.Muted.Render("[ ]")
		if f.checked[i] {
			box = th.Pass.Render("[x]")
		}
		cell := box + " " + item
		last := &lines[len(lines)-1]
		switch {
		case fresh:
			*last += " " + cell
			fresh = false
		case lipgloss.Width(*last+sep+cell) <= width:
			*last += sep + cell
		default:
			lines = append(lines, cell)
		}
	}
	for i := range lines {
		lines[i] = ui.Truncate(lines[i], width)
	}
	return lines
}

func (f *Focus) bannerCard(width int) string {
	if f.banner == "" {
		return ""
	}
	title, body, _ := strings.Cut(f.banner, " · ")
	if f.timeUp {
		return ui.CardTone(f.s.Theme, "✗ "+title, body, width, ui.ToneFail)
	}
	return ui.CardTone(f.s.Theme, "✓ "+title, body, width, ui.TonePass)
}

func wrapIndent(s string, indent, width int) []string {
	pad := strings.Repeat(" ", indent)
	var out []string
	for _, line := range strings.Split(strings.TrimRight(s, "\n"), "\n") {
		for _, part := range ui.WrapLines(line, max(width-indent, 1)) {
			out = append(out, pad+part)
		}
	}
	return out
}

func (f *Focus) testLines(width int) []string {
	th := f.s.Theme
	res := f.last
	var out []string
	add := func(style lipgloss.Style, s string, indent int) {
		for _, l := range wrapIndent(s, indent, width) {
			out = append(out, style.Render(l))
		}
	}
	plainStyle := lipgloss.NewStyle()
	switch {
	case f.err != "":
		add(th.Fail, f.err, 0)
		return out
	case !f.ran && f.running:
		return []string{th.Accent.Render(ui.SpinnerFrame(f.frame)) + " running tests…"}
	case !f.ran:
		return []string{th.Muted.Render("waiting for the first run")}
	case res.Err != nil:
		add(th.Fail, "tests could not run: "+res.Err.Error(), 0)
		if res.Output != "" {
			out = append(out, "")
			add(th.Muted, res.Output, 0)
		}
		return out
	case res.TimedOut:
		add(th.Fail, fmt.Sprintf("timed out: the run took longer than %s", f.s.App.Config.Timeout), 0)
		if res.Output != "" {
			out = append(out, "")
			add(th.Muted, res.Output, 0)
		}
		return out
	case res.NotStarted:
		add(th.Muted, "not started · press e to code", 0)
		for _, t := range res.Tests {
			add(plainStyle, "○ "+testLabel(f.fnName, t.Name), 0)
		}
		return out
	}
	for _, t := range res.Tests {
		if t.Outcome == runner.Passed {
			continue
		}
		glyph, style := "✗ ", th.Fail
		if t.Outcome == runner.Skipped {
			glyph, style = "– ", th.Muted
		}
		out = append(out, style.Render(glyph)+ui.Truncate(testLabel(f.fnName, t.Name), max(width-2, 1)))
		msg := t.Message
		if t.Outcome == runner.Errored || msg == "collection failure" {
			if detail := lastErrorLine(t.Detail); detail != "" {
				msg = strings.TrimSpace(strings.TrimPrefix(detail, "E"))
			}
		}
		if msg != "" {
			add(style, msg, 2)
		}
		if d := strings.TrimSpace(t.Detail); d != "" && d != msg {
			add(th.Muted, d, 4)
		}
		out = append(out, "")
	}
	for _, t := range res.Tests {
		if t.Outcome == runner.Passed {
			out = append(out, th.Pass.Render("✓ ")+ui.Truncate(testLabel(f.fnName, t.Name), max(width-2, 1)))
		}
	}
	if res.Total == 0 && res.Output != "" {
		add(th.Fail, "tests could not run", 0)
		add(th.Muted, res.Output, 0)
	}
	for len(out) > 0 && out[len(out)-1] == "" {
		out = out[:len(out)-1]
	}
	return out
}

func (f *Focus) scrolledCard(title string, lines []string, top *int, width, height int, w window) string {
	rows := max(height-2, 1)
	f.rows[w] = rows
	f.shown[w] = lines
	*top = min(*top, max(len(lines)-rows, 0))
	if len(lines) > rows {
		title += fmt.Sprintf(" · %d-%d/%d", *top+1, min(*top+rows, len(lines)), len(lines))
	}
	body := lines[*top:]
	if len(body) > rows {
		body = body[:rows]
	}
	return ui.Card(f.s.Theme, title, strings.Join(padLines(body, rows), "\n"), width, f.win == w)
}

func (f *Focus) statementCard(width, height int) string {
	title := map[pane]string{panePrompt: "problem", paneSolution: "reference solution", paneDiff: "diff vs last version"}[f.pane]
	return f.scrolledCard(title, f.paneLines(max(width-4, 10)), &f.scroll, width, height, winProblem)
}

func (f *Focus) failing() bool {
	res := f.last
	switch {
	case f.err != "":
		return true
	case !f.ran || res.NotStarted:
		return false
	case res.Err != nil || res.TimedOut:
		return true
	}
	return !res.Green()
}

func (f *Focus) testsCard(lines []string, width, height int) string {
	title := "tests"
	if f.ran && f.err == "" && f.last.Err == nil && !f.last.TimedOut && f.last.Total > 0 {
		title = fmt.Sprintf("tests · %d/%d passed", f.last.Passed, f.last.Total)
	}
	return f.scrolledCard(title, lines, &f.testsTop, width, height, winTests)
}

const sidebarWidth = 30

func (f *Focus) View(w, h int) string {
	th := f.s.Theme
	if f.confirmRestart {
		return ui.Modal(th, "restart timer", "Set the clock back to 00:00? A pass after a restart will not count as clean, "+
			"so this problem comes back for review in 1 day.\n\n"+
			th.Accent.Render("y")+" restart    "+th.Accent.Render("n")+" cancel", w, h)
	}
	if f.paused() {
		body := th.Title.Render(mmss(f.Elapsed())+" / "+mmss(f.p.TimeTarget)) + th.Muted.Render(" · clock stopped") + "\n\n" +
			"The problem is hidden while paused, and saves rerun tests when you resume.\n\n" +
			th.Accent.Render("p") + " resume    " + th.Accent.Render("R") + " restart timer    " + th.Accent.Render("esc") + " back"
		head := []string{"", f.header(w), ""}
		return strings.Join(append(head, ui.Modal(th, "paused", body, w, max(h-len(head), 1))), "\n")
	}
	if f.confirm {
		return ui.Modal(th, "reset", "Reset to the starter? Your current code is kept as a snapshot.\n\n"+
			th.Accent.Render("y")+" reset    "+th.Accent.Render("n")+" cancel", w, h)
	}
	lines := []string{"", f.header(w), ""}
	inner := w - 4
	wide := w >= 100
	banner := f.bannerCard(inner)
	if banner != "" {
		lines = append(lines, indent(banner, 2)...)
	}
	var strip []string
	if !wide {
		_, dots := f.testGlyphs()
		elapsed := float64(f.Elapsed()) / float64(max(f.p.TimeTarget, time.Second))
		strip = []string{
			ui.Truncate("  ⏱ "+mmss(f.Elapsed())+" "+ui.Bar(th, elapsed, 12, f.timerTone())+th.Muted.Render(" · ")+"tests "+dots+" "+f.testStatus(), w),
		}
		for _, l := range f.checklistLines(max(w-2, 1)) {
			strip = append(strip, "  "+l)
		}
	}
	space := max(h-len(lines)-len(strip), 3)

	tests := f.testLines(max(inner-4, 1))
	solo := f.zoom || space < 8
	var testH, probH int
	switch {
	case solo && f.win == winTests:
		testH = space
	case solo:
		probH = space
	default:
		limit := space / 2
		switch {
		case f.win == winTests:
			limit = space * 2 / 3
		case !f.failing() && len(tests)+2 > space/2:
			limit = max(space/4, 3)
		}
		testH = max(min(len(tests)+2, limit), 3)
		probH = space - testH
	}

	f.winY = [windowCount][2]int{}
	if probH > 0 {
		f.winY[winProblem] = [2]int{len(lines), len(lines) + probH}
		if wide {
			stmtW := inner - sidebarWidth - 2
			lines = append(lines, indent(ui.Columns(2, f.statementCard(stmtW, probH), f.sidebar(sidebarWidth, probH)), 2)...)
		} else {
			lines = append(lines, indent(f.statementCard(inner, probH), 2)...)
		}
	}
	lines = append(lines, strip...)
	if testH > 0 {
		f.winY[winTests] = [2]int{len(lines), len(lines) + testH}
		lines = append(lines, indent(f.testsCard(tests, inner, testH), 2)...)
	}
	return strings.Join(lines, "\n")
}
