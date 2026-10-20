package catalog

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func load(t *testing.T, name string) *Catalog {
	t.Helper()
	c, err := Load(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("Load(%s): %v", name, err)
	}
	return c
}

func ids(ps []*Problem) []string {
	out := make([]string, len(ps))
	for i, p := range ps {
		out[i] = p.ID
	}
	return out
}

func TestLoadGood(t *testing.T) {
	c := load(t, "good")
	if got, want := strings.Join(ids(c.Problems()), ","), "two-sum,p-one,p-two,p-three"; got != want {
		t.Fatalf("order = %s, want %s", got, want)
	}
	for i, p := range c.Problems() {
		if p.Order != i {
			t.Errorf("%s Order = %d, want %d", p.ID, p.Order, i)
		}
	}
	one, ok := c.Problem("p-one")
	if !ok {
		t.Fatal("p-one missing")
	}
	if one.TimeTarget != 15*time.Minute || one.Difficulty != Easy || !one.HasSolution {
		t.Fatalf("p-one = %+v", one)
	}
	if one.Hints[0] != "use +" || one.KeyIdea != "add them" {
		t.Fatalf("p-one metadata = %+v", one)
	}
	if strings.Join(one.SayAloud, ",") != strings.Join(DefaultSayAloud, ",") {
		t.Fatalf("SayAloud default = %v", one.SayAloud)
	}
	two, _ := c.Problem("p-two")
	if two.TimeTarget != 20*time.Minute || two.HasSolution || two.SayAloud[0] != "invariant" {
		t.Fatalf("p-two = %+v", two)
	}
	three, _ := c.Problem("p-three")
	if three.TimeTarget != 45*time.Minute {
		t.Fatalf("hard default = %v", three.TimeTarget)
	}
	if one.Technique.Title != "One" || one.Technique.Module.Title != "Alpha" || one.Technique.Module.ID != "alpha" {
		t.Fatalf("parents = %+v", one.Technique)
	}
	if !strings.HasSuffix(one.Technique.Note, filepath.Join("01_alpha", "notes", "01_a.md")) || three.Technique.Note != "" {
		t.Fatalf("notes = %q %q", one.Technique.Note, three.Technique.Note)
	}
	if len(one.Technique.Module.Notes) != 2 {
		t.Fatalf("module notes = %v", one.Technique.Module.Notes)
	}
	if !strings.HasSuffix(one.StarterPath(), "001_p_one/starter.py") || !strings.HasSuffix(one.TestPath(), "test_problem.py") {
		t.Fatalf("paths = %s %s", one.StarterPath(), one.TestPath())
	}
	if !strings.HasSuffix(c.LibDir(), filepath.Join("curriculum", "_lib")) {
		t.Fatalf("LibDir = %s", c.LibDir())
	}
}

func TestLoadBadReportsAll(t *testing.T) {
	_, err := Load(filepath.Join("testdata", "bad"))
	if err == nil {
		t.Fatal("want error")
	}
	for _, want := range []string{`duplicate id "dup"`, "test_problem.py", `invalid difficulty "brutal"`} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error missing %q:\n%v", want, err)
		}
	}
}

func TestPlaylistResolve(t *testing.T) {
	c := load(t, "good")
	if len(c.Playlists) != 1 {
		t.Fatalf("playlists = %d", len(c.Playlists))
	}
	pl := c.Playlists[0]
	if pl.ID != "01_meta" || pl.Title != "Meta" || pl.Focus != "speed" {
		t.Fatalf("playlist = %+v", pl)
	}
	if pl.Entries[0].Problem == nil || pl.Entries[0].Problem.ID != "two-sum" {
		t.Fatalf("entry 0 should resolve to two-sum: %+v", pl.Entries[0])
	}
	if pl.Entries[1].Problem != nil {
		t.Fatalf("entry 1 should be external")
	}
}

func TestFindRoot(t *testing.T) {
	good, _ := filepath.Abs(filepath.Join("testdata", "good"))
	nested := filepath.Join(good, "curriculum", "01_alpha", "notes")
	t.Setenv("MYLEET_ROOT", "")
	root, err := FindRoot(nested)
	if err != nil || root != good {
		t.Fatalf("FindRoot = %q, %v", root, err)
	}
	t.Setenv("MYLEET_ROOT", "/elsewhere")
	if root, _ := FindRoot(nested); root != "/elsewhere" {
		t.Fatalf("MYLEET_ROOT ignored: %q", root)
	}
	t.Setenv("MYLEET_ROOT", "")
	if _, err := FindRoot(os.TempDir()); err == nil {
		t.Fatal("want error outside a repo")
	}
}

func TestLoadRealCurriculum(t *testing.T) {
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	if _, err := os.Stat(filepath.Join(root, "curriculum")); err != nil {
		t.Skip("no curriculum")
	}
	c, err := Load(root)
	if err != nil {
		t.Fatal(err)
	}
	if n := len(c.Problems()); n < 650 {
		t.Fatalf("only %d problems", n)
	}
}

func TestRealStartersDoNotSpoilTheKeyIdea(t *testing.T) {
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	c, err := Load(root)
	if err != nil {
		t.Skip("real curriculum unavailable")
	}
	for _, p := range c.Problems() {
		data, err := os.ReadFile(p.StarterPath())
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(data), "Key idea:") {
			t.Errorf("%s: starter names the key idea; it belongs only in problem.toml", p.ID)
		}
	}
}
