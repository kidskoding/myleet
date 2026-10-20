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

	last      runner.Result
	ran       bool
	running   bool
	green     bool
	passed    bool
	elapsed   time.Duration
	banner    string
	hints     int
	peeked    bool
	gaveUp    bool
	closed    bool
	confirm   bool
	checked   []bool
	pane      pane
	paneText  string
	scroll    int
	err       string
	cancel    context.CancelFunc
	watchCh   <-chan struct{}
	penalties time.Duration
	statement string
	stmtState prompt.Status
	baseline  []byte               // attempt content when the attempt started
	clock     func() time.Duration // interview rounds time each problem separately
	seq       int
	frame     int
	fnName    string
}

func NewFocus(s *Shared, p *catalog.Problem, mode progress.Mode) Screen {
	return newFocus(s, p, mode)
}

func newFocus(s *Shared, p *catalog.Problem, mode progress.Mode) *Focus {
	return &Focus{s: s, p: p, mode: mode, attempt: progress.NewAttemptID(), checked: make([]bool, len(p.SayAloud))}
}

func (f *Focus) Title() string {
	if f.mode == progress.Interview {
		return "interview"
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
	if f.mode == progress.Interview {
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
	if f.statement == "" || f.p.KeyIdea == "" || f.mode == progress.Interview {
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
	if f.mode == progress.Practice && !f.gaveUp && !f.passed && f.path != "" {
		f.s.Record(f.event(progress.Left, nil))
	}
}

func (f *Focus) edited() bool {
	attempt, err1 := os.ReadFile(f.path)
	starter, err2 := os.ReadFile(f.p.StarterPath())
	return err1 != nil || err2 != nil || !bytes.Equal(attempt, starter)
}

func (f *Focus) Elapsed() time.Duration {
	if f.passed {
		return f.elapsed
	}
	if f.clock != nil {
		return f.clock()
	}
	return f.s.App.Now().Sub(f.start) + f.penalties
}

func (f *Focus) Green() bool { return f.green }

func (f *Focus) Update(msg tea.Msg) (Screen, tea.Cmd) {
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
		return f, tea.Batch(f.run(true), f.waitForChange())
	case editorDoneMsg:
		if msg.f != f || f.closed {
			return f, nil
		}
		if msg.err != nil {
			f.err = "editor: " + msg.err.Error()
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
	}
	return f, nil
}

func (f *Focus) finishRun(res runner.Result, logged bool) tea.Cmd {
	f.running, f.ran, f.last = false, true, res
	f.green = res.Green()
	if logged {
		f.s.Record(f.event(progress.TestRun, map[string]string{"passed": strconv.Itoa(res.Passed), "total": strconv.Itoa(res.Total)}))
	}
	if f.green {
		_, _ = f.s.App.Workspace.Snapshot(f.p.ID, f.s.App.Now())
	}
	if f.green && logged && !f.passed && f.mode == progress.Practice {
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
	next := "next " + dateLabel(after.Due)
	switch {
	case att.Peeks > 0:
		return "passed (solution peeked) · back to 1d · " + next
	case att.Hints > 0:
		return "passed (hint used) · back to 1d · " + next
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
		if f.p.HasSolution && f.mode == progress.Practice {
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
		if f.mode == progress.Practice && !f.passed {
			f.gaveUp = true
			f.s.Record(f.event(progress.GaveUp, nil))
			return f, pop
		}
	case "j", "down":
		f.scroll++
	case "k", "up":
		f.scroll = max(f.scroll-1, 0)
	case "esc":
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

func (f *Focus) togglePane(p pane) {
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

// OwnsKey: while the reset prompt is open, q must answer it rather than quit.
func (f *Focus) OwnsKey(string) bool { return f.confirm }

func (f *Focus) Help() []string {
	return []string{"e      edit in $EDITOR (tests rerun on save)", "space  rerun tests", "t      reveal next hint",
		"s      show reference solution", "d      diff against your last attempt", "o      open problem page",
		"r      reset attempt to starter", "1-3    tick say-it-out-loud items", "g      give up", "esc    back"}
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
		if f.mode == progress.Practice && f.p.KeyIdea != "" {
			b.WriteString("**Key idea:** " + f.p.KeyIdea + "\n\n")
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
	keys := []ui.Key{{Key: "e", Label: "edit"}}
	if hints := f.hintList(); f.hints < len(hints) {
		keys = append(keys, ui.Key{Key: "t", Label: fmt.Sprintf("hint %d/%d", f.hints+1, len(hints))})
	}
	keys = append(keys, ui.Key{Key: "d", Label: "diff"})
	if f.p.URL != "" {
		keys = append(keys, ui.Key{Key: "o", Label: "leetcode"})
	}
	return append(keys, ui.Key{Key: "esc", Label: "back"})
}

func (f *Focus) header(w int) string {
	th := f.s.Theme
	where := "??? hidden"
	if f.mode == progress.Practice {
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
	tests, _ := f.testGlyphs()
	body := []string{
		ui.Bar(th, float64(f.Elapsed())/float64(max(f.p.TimeTarget, time.Second)), inner, f.timerTone()),
		"",
		th.Muted.Render("tests ") + f.testStatus(),
	}
	body = append(body, tests...)
	body = append(body, "", th.Muted.Render("say it aloud"))
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

func (f *Focus) checklistLine() string {
	th := f.s.Theme
	items := make([]string, len(f.p.SayAloud))
	for i, item := range f.p.SayAloud {
		box := th.Muted.Render("[ ]")
		if f.checked[i] {
			box = th.Pass.Render("[x]")
		}
		items[i] = box + " " + item
	}
	return th.Muted.Render("say it aloud  ") + strings.Join(items, th.Border.Render(" · "))
}

func (f *Focus) resultCard(width int) string {
	th := f.s.Theme
	if f.banner != "" {
		title, body, _ := strings.Cut(f.banner, " · ")
		return ui.CardTone(th, "✓ "+title, body, width, ui.TonePass)
	}
	res := f.last
	switch {
	case !f.ran || res.NotStarted:
		return ""
	case res.Err != nil:
		return ui.Card(th, "✗ tests could not run", res.Err.Error(), width, false)
	case res.TimedOut:
		return ui.Card(th, "✗ timed out", fmt.Sprintf("the run took longer than %s", f.s.App.Config.Timeout), width, false)
	}
	for _, t := range res.Tests {
		if t.Outcome == runner.Passed {
			continue
		}
		msg := t.Message
		if t.Outcome == runner.Errored || msg == "collection failure" {
			if detail := lastErrorLine(t.Detail); detail != "" {
				msg = strings.TrimSpace(strings.TrimPrefix(detail, "E"))
			}
		}
		return ui.Card(th, "✗ "+testLabel(f.fnName, t.Name), th.Fail.Render(msg), width, false)
	}
	if res.Total == 0 && res.Output != "" {
		return ui.Card(th, "✗ tests could not run", lastErrorLine(res.Output), width, false)
	}
	return ""
}

func (f *Focus) statementCard(width, height int) string {
	title := map[pane]string{panePrompt: "problem", paneSolution: "reference solution", paneDiff: "diff vs last version"}[f.pane]
	rows := max(height-2, 1)
	body := f.paneLines(max(width-4, 10))
	f.scroll = min(f.scroll, max(len(body)-rows, 0))
	body = body[f.scroll:]
	if len(body) > rows {
		body = body[:rows]
	}
	return ui.Card(f.s.Theme, title, strings.Join(padLines(body, rows), "\n"), width, false)
}

const sidebarWidth = 30

func (f *Focus) View(w, h int) string {
	th := f.s.Theme
	if f.confirm {
		return ui.Modal(th, "reset", "Reset to the starter? Your current code is kept as a snapshot.\n\n"+
			th.Accent.Render("y")+" reset    "+th.Accent.Render("n")+" cancel", w, h)
	}
	lines := []string{"", f.header(w), ""}
	inner := w - 4
	result := f.resultCard(inner)
	resultH := 0
	if result != "" {
		resultH = strings.Count(result, "\n") + 1
	}
	avail := max(h-len(lines)-resultH, 4)
	if w >= 100 {
		stmtW := inner - sidebarWidth - 2
		lines = append(lines, indent(ui.Columns(2, f.statementCard(stmtW, avail), f.sidebar(sidebarWidth, avail)), 2)...)
	} else {
		_, dots := f.testGlyphs()
		elapsed := float64(f.Elapsed()) / float64(max(f.p.TimeTarget, time.Second))
		strip := "  ⏱ " + mmss(f.Elapsed()) + " " + ui.Bar(th, elapsed, 12, f.timerTone()) + th.Muted.Render(" · ") + "tests " + dots + " " + f.testStatus()
		lines = append(lines, indent(f.statementCard(inner, max(avail-2, 3)), 2)...)
		lines = append(lines, ui.Truncate(strip, w), ui.Truncate("  "+f.checklistLine(), w))
	}
	if result != "" {
		lines = append(lines, indent(result, 2)...)
	}
	return strings.Join(lines, "\n")
}
