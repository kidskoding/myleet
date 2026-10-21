package tui

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/kidskoding/myleet/internal/placement"
	"github.com/kidskoding/myleet/internal/progress"
)

func TestSettingsResetClearsProgress(t *testing.T) {
	events := append([]progress.Event{placementSkipped()}, passedEvents("p-one", 18)...)
	a := newTestApp(t, events...)
	path := a.Workspace.AttemptPath("p-one")
	os.MkdirAll(filepath.Dir(path), 0o755)
	os.WriteFile(path, []byte("x = 1\n"), 0o644)
	s := newTestShared(t, a, &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("5"), key("G"))
	if _, ok := m.(Model).top().(*Settings); !ok {
		t.Fatalf("top = %T", m.(Model).top())
	}
	m = send(m, key("enter"), key("y"), key("y"))
	if len(a.Events) != 0 {
		t.Fatalf("events should be empty: %d", len(a.Events))
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("attempt should be removed: %v", err)
	}
	if !placement.Needs(a.Events, a.Attempts()) {
		t.Fatal("after reset, placement should be needed again")
	}
	view := plain(send(m, key("G")))
	if !strings.Contains(view, "danger zone") {
		t.Fatalf("view:\n%s", view)
	}
}

func TestSettingsResetCancel(t *testing.T) {
	a := newTestApp(t, progress.Event{
		Time: testNow, Kind: progress.PlacementDone, Mode: progress.Placement,
		Data: map[string]string{"skipped": "1"},
	})
	s := newTestShared(t, a, &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 24}, key("5"), key("G"), key("enter"), key("n"))
	st := m.(Model).top().(*Settings)
	if st.confirm != 0 || len(a.Events) != 1 {
		t.Fatalf("cancel should keep progress: confirm=%d events=%d", st.confirm, len(a.Events))
	}
}

func TestSettingsResetIsRedAndConfirmsTwice(t *testing.T) {
	s := newTestShared(t, newTestApp(t, placementSkipped()), &fakeRunner{})
	m := send(New(s, ""), tea.WindowSizeMsg{Width: 80, Height: 40}, key("5"), key("G"))
	raw := m.View().Content
	wantItem := s.Theme.Fail.Render("Reset all progress")
	if !strings.Contains(raw, wantItem) && !strings.Contains(raw, s.Theme.Fail.Bold(true).Reverse(true).Render(" Reset all progress ")) {
		t.Fatalf("reset item should be red:\n%s", plain(m))
	}
	m = send(m, key("enter"))
	if !strings.Contains(plain(m), "start fresh?") || !strings.Contains(m.View().Content, s.Theme.Fail.Bold(true).Render("y")) {
		t.Fatalf("first confirm should be a red modal:\n%s", plain(m))
	}
	m = send(m, key("y"))
	if !strings.Contains(plain(m), "really wipe everything?") {
		t.Fatalf("second confirm missing:\n%s", plain(m))
	}
}
