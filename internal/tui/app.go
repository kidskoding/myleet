package tui

import (
	"context"
	"math/rand"
	"os/exec"
	"runtime"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"github.com/charmbracelet/x/ansi"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/progress"
	"github.com/kidskoding/myleet/internal/prompt"
	"github.com/kidskoding/myleet/internal/runner"
	"github.com/kidskoding/myleet/internal/schedule"
	"github.com/kidskoding/myleet/internal/theme"
	"github.com/kidskoding/myleet/internal/tui/ui"
	"github.com/kidskoding/myleet/internal/watch"
)

type Screen interface {
	Update(msg tea.Msg) (Screen, tea.Cmd)
	View(width, height int) string
	Title() string
}

type (
	initer   interface{ Init() tea.Cmd }
	closer   interface{ Close() }
	keyOwner interface{ OwnsKey(k string) bool }
	// filterer screens narrow their own list on /; StartFilter reports whether one did.
	filterer interface{ StartFilter() bool }
	mouser   interface{ WantsMouse() bool }
	helper   interface{ Help() []string }
)

type (
	PushMsg struct{ Screen Screen }
	PopMsg  struct{}
	// JumpMsg leaves the current screen (and an open problem under it) for Screen.
	JumpMsg struct{ Screen Screen }
)

func push(s Screen) tea.Cmd { return func() tea.Msg { return PushMsg{s} } }
func pop() tea.Msg          { return PopMsg{} }
func jump(s Screen) tea.Cmd { return func() tea.Msg { return JumpMsg{s} } }

type promptSource interface {
	Get(ctx context.Context, p *catalog.Problem) prompt.Result
}

type testRunner interface {
	Run(ctx context.Context, testFile, codeFile string) runner.Result
}

// Shared's hooks (Runner, Tick, Watch, Open, After, Spin) are swapped out in tests.
type Shared struct {
	App     *app.App
	Theme   theme.Theme
	Runner  testRunner
	Prompts promptSource
	Tick    func() tea.Cmd
	Watch   func(ctx context.Context, path string, debounce time.Duration) (<-chan struct{}, error)
	Open    func(url string) error
	Rand    *rand.Rand
	Status  string                                     // an error that stays on screen until restart (e.g. a failed save)
	After   func(d time.Duration, msg tea.Msg) tea.Cmd // nil disables timed messages
	Spin    func() tea.Cmd

	toast   string
	toastID int
}

const toastLife = 2 * time.Second

type toastExpiredMsg struct{ id int }

func (s *Shared) Toast(text string) {
	s.toast = text
	s.toastID++
}

type TickMsg time.Time

func NewShared(a *app.App) *Shared {
	return &Shared{
		App:     a,
		Theme:   theme.New(),
		Runner:  a.Runner,
		Prompts: a.Prompts,
		Tick:    func() tea.Cmd { return tea.Tick(time.Second, func(t time.Time) tea.Msg { return TickMsg(t) }) },
		Watch:   watch.File,
		Open:    openURL,
		Rand:    rand.New(rand.NewSource(time.Now().UnixNano())),
		Spin:    func() tea.Cmd { return tea.Tick(100*time.Millisecond, func(time.Time) tea.Msg { return nil }) },
		After: func(d time.Duration, msg tea.Msg) tea.Cmd {
			return tea.Tick(d, func(time.Time) tea.Msg { return msg })
		},
	}
}

func openURL(url string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", url).Start()
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func (s *Shared) Record(e progress.Event) {
	if err := s.App.Record(e); err != nil {
		s.Status = "could not save progress: " + err.Error()
	}
}

func (s *Shared) States() map[string]schedule.State { return s.App.States() }

func (s *Shared) Now() time.Time { return s.App.Now().In(s.App.Loc) }

type Model struct {
	s             *Shared
	stack         []Screen
	width, height int
	help          bool
	seenToast     int
}

type (
	tabbed interface{ Tab() int }
	keyed  interface{ Keys() []ui.Key }
)

var tabNames = []string{"today", "map", "timed", "playlists", "stats"}

func newTab(s *Shared, i int) Screen {
	switch i {
	case 1:
		return NewMap(s)
	case 2:
		return NewInterview(s)
	case 3:
		return NewPlaylists(s)
	case 4:
		return NewSettings(s)
	}
	return NewHome(s)
}

type TabMsg struct{ Tab int }

func switchTab(i int) tea.Cmd { return func() tea.Msg { return TabMsg{i} } }

func (m Model) activeTab() int {
	for i := len(m.stack) - 1; i >= 0; i-- {
		if t, ok := m.stack[i].(tabbed); ok {
			return t.Tab()
		}
	}
	return 0
}

func New(s *Shared, openID string) Model {
	m := Model{s: s, stack: []Screen{NewHome(s)}, width: 80, height: 24}
	if p, ok := s.App.Catalog.Problem(openID); ok {
		m.stack = append(m.stack, NewFocus(s, p, progress.Practice))
	}
	return m
}

func Run(a *app.App, openID string) error {
	_, err := tea.NewProgram(New(NewShared(a), openID)).Run()
	return err
}

func (m Model) top() Screen { return m.stack[len(m.stack)-1] }

func (m *Model) popTop() {
	if c, ok := m.top().(closer); ok {
		c.Close()
	}
	m.stack = m.stack[:len(m.stack)-1]
}

func (m Model) Init() tea.Cmd {
	var cmds []tea.Cmd
	for _, s := range m.stack {
		if i, ok := s.(initer); ok {
			cmds = append(cmds, i.Init())
		}
	}
	return tea.Batch(cmds...)
}

func (m Model) closeAll() {
	for i := len(m.stack) - 1; i >= 0; i-- {
		if c, ok := m.stack[i].(closer); ok {
			c.Close()
		}
	}
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	next, cmd := m.update(msg)
	nm := next.(Model)
	if nm.s.toastID != nm.seenToast {
		nm.seenToast = nm.s.toastID
		if nm.s.After != nil {
			cmd = tea.Batch(cmd, nm.s.After(toastLife, toastExpiredMsg{nm.s.toastID}))
		}
	}
	return nm, cmd
}

func (m Model) update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case toastExpiredMsg:
		if msg.id == m.s.toastID {
			m.s.toast = ""
		}
		return m, nil
	case TabMsg:
		for len(m.stack) > 1 {
			m.popTop()
		}
		if c, ok := m.top().(closer); ok {
			c.Close()
		}
		root := newTab(m.s, msg.Tab)
		m.stack[0] = root
		if i, ok := root.(initer); ok {
			return m, i.Init()
		}
		return m, nil
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil
	case PushMsg:
		m.stack = append(m.stack, msg.Screen)
		if i, ok := msg.Screen.(initer); ok {
			return m, i.Init()
		}
		return m, nil
	case JumpMsg:
		m.popTop()
		if _, isFocus := m.top().(*Focus); isFocus && len(m.stack) > 1 {
			m.popTop()
		}
		m.stack = append(m.stack, msg.Screen)
		if i, ok := msg.Screen.(initer); ok {
			return m, i.Init()
		}
		return m, nil
	case PopMsg:
		if len(m.stack) == 1 {
			if _, home := m.top().(*Home); home {
				return m, nil
			}
			return m.update(TabMsg{0})
		}
		m.popTop()
		return m, nil
	case tea.KeyPressMsg:
		return m.handleKey(msg)
	case tea.MouseMsg:
		if m.help {
			return m, nil
		}
		return m.forward(shiftMouse(msg, -tabBarHeight))
	}
	// Non-key messages reach every screen; each ignores what is not addressed to it.
	var cmds []tea.Cmd
	for i, s := range m.stack {
		next, cmd := s.Update(msg)
		m.stack[i] = next
		cmds = append(cmds, cmd)
	}
	return m, tea.Batch(cmds...)
}

func (m Model) handleKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	k := msg.String()
	if k == "ctrl+c" {
		m.closeAll()
		return m, tea.Quit
	}
	if m.help {
		m.help = false
		return m, nil
	}
	if owner, ok := m.top().(keyOwner); ok && owner.OwnsKey(k) {
		return m.forward(msg)
	}
	if len(m.stack) == 1 {
		if n := strings.Index("12345", k); len(k) == 1 && n >= 0 {
			return m.update(TabMsg{n})
		}
		switch k {
		case "tab":
			return m.update(TabMsg{(m.activeTab() + 1) % len(tabNames)})
		case "shift+tab":
			return m.update(TabMsg{(m.activeTab() + len(tabNames) - 1) % len(tabNames)})
		}
	}
	switch k {
	case "?":
		m.help = true
		return m, nil
	case "q":
		m.closeAll()
		return m, tea.Quit
	case "/", "ctrl+k":
		if _, searching := m.top().(*Search); searching {
			break
		}
		if f, ok := m.top().(filterer); ok && k == "/" && f.StartFilter() {
			return m, nil
		}
		return m, push(NewSearch(m.s))
	}
	return m.forward(msg)
}

func (m Model) forward(msg tea.Msg) (tea.Model, tea.Cmd) {
	next, cmd := m.top().Update(msg)
	m.stack[len(m.stack)-1] = next
	return m, cmd
}

func (m Model) View() tea.View {
	th := m.s.Theme
	bodyH := m.height - 3
	if m.s.Status != "" {
		bodyH--
	}
	var body string
	if m.help {
		body = m.helpView(m.width, max(bodyH, 1))
	} else {
		body = m.top().View(m.width, max(bodyH, 1))
	}
	lines := strings.Split(ui.TabBar(th, tabNames, m.activeTab(), m.width), "\n")
	bodyLines := strings.Split(fit(body, m.width, max(bodyH, 0)), "\n")
	for len(bodyLines) < bodyH {
		bodyLines = append(bodyLines, "")
	}
	lines = append(lines, bodyLines[:max(bodyH, 0)]...)
	if m.s.Status != "" {
		lines = append(lines, " "+th.Fail.Render(m.s.Status))
	}
	var keys []ui.Key
	if k, ok := m.top().(keyed); ok {
		keys = k.Keys()
	}
	if m.offersSearch(keys) {
		keys = append(keys, ui.Key{Key: "/", Label: "search"})
	}
	toast := ""
	if m.s.toast != "" {
		toast = th.Accent.Render("● ") + m.s.toast + " "
	}
	lines = append(lines, ui.KeyBar(th, keys, m.width, toast))
	v := tea.NewView(fit(strings.Join(lines, "\n"), m.width, m.height))
	v.AltScreen = true
	if mo, ok := m.top().(mouser); ok && mo.WantsMouse() && !m.help {
		v.MouseMode = tea.MouseModeCellMotion
	}
	v.WindowTitle = "myleet · " + m.top().Title()
	return v
}

func (m Model) offersSearch(keys []ui.Key) bool {
	top := m.top()
	if _, searching := top.(*Search); searching {
		return false
	}
	if _, filters := top.(filterer); filters {
		return false
	}
	if o, ok := top.(keyOwner); ok && o.OwnsKey("/") {
		return false
	}
	for _, k := range keys {
		if k.Key == "/" {
			return false
		}
	}
	return true
}

func fit(s string, width, height int) string {
	lines := strings.Split(strings.TrimRight(s, "\n"), "\n")
	if len(lines) > height {
		lines = lines[:max(height, 0)]
	}
	for i, l := range lines {
		lines[i] = ansi.Truncate(l, max(width, 0), "…")
	}
	return strings.Join(lines, "\n")
}
