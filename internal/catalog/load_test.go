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
	if got, want := strings.Join(ids(c.Problems()), ","), "p-one,p-two,p-three,two-sum,logger-rate-limiter"; got != want {
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
	if len(c.Playlists) != 2 {
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

func TestBankLoadsAsItsOwnModule(t *testing.T) {
	c := load(t, "good")
	p, ok := c.Problem("logger-rate-limiter")
	if !ok || !p.Technique.Module.Bank || p.Technique.Module.Title != "Problem Bank" {
		t.Fatalf("bank problem = %+v", p)
	}
	all := c.Problems()
	if all[len(all)-1].ID != "logger-rate-limiter" {
		t.Fatal("the bank sorts after every curriculum module")
	}
	if got := len(c.Curriculum()); got != 4 {
		t.Fatalf("Curriculum() = %d problems, want 4 (bank excluded)", got)
	}
	if e := c.Playlists[0].Entries[2]; e.Problem == nil || e.Problem.ID != "logger-rate-limiter" {
		t.Fatal("playlist entries resolve to bank problems")
	}
}

func TestModulesAndProblemsFollowReadingOrder(t *testing.T) {
	c := load(t, "good")
	var mods []string
	for _, m := range c.Modules {
		mods = append(mods, m.ID)
	}
	if got := strings.Join(mods, ","); got != "alpha,beta,bank" {
		t.Fatalf("modules should list by number with the bank last, got %s", got)
	}
}

func TestLoadGuide(t *testing.T) {
	root := t.TempDir()
	files := map[string]string{
		"curriculum/.keep":          "",
		"guide/01_how_to_prep.md":   "# How to Prepare\n\nLearn, practice, review.\n",
		"guide/02_python_basics.md": "Python basics without a heading.\n",
		"guide/README.md":           "# Guide\n\nIndex for GitHub readers.\n",
	}
	for name, body := range files {
		path := filepath.Join(root, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	c, err := Load(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Guide) != 2 {
		t.Fatalf("guide = %+v, want the 2 numbered notes", c.Guide)
	}
	if c.Guide[0].Title != "How to Prepare" || !strings.HasSuffix(c.Guide[0].Path, filepath.Join("guide", "01_how_to_prep.md")) {
		t.Fatalf("guide[0] = %+v", c.Guide[0])
	}
	if c.Guide[1].Title != "Python Basics" {
		t.Fatalf("a note without a heading should be titled from its file name, got %q", c.Guide[1].Title)
	}
	if len(c.Modules) != 0 {
		t.Fatalf("the guide is not a module: %+v", c.Modules)
	}
}
