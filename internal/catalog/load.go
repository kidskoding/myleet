package catalog

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/BurntSushi/toml"
)

var (
	numbered = regexp.MustCompile(`^(\d+)_(.+)$`)
	lcSlug   = regexp.MustCompile(`leetcode\.com/problems/([a-z0-9-]+)`)
)

type moduleFile struct {
	Title       string `toml:"title"`
	Description string `toml:"description"`
}

type techniqueFile struct {
	Title string `toml:"title"`
	Note  string `toml:"note"`
}

type problemFile struct {
	ID         string   `toml:"id"`
	Title      string   `toml:"title"`
	Difficulty string   `toml:"difficulty"`
	LeetCode   int      `toml:"leetcode"`
	URL        string   `toml:"url"`
	KeyIdea    string   `toml:"key_idea"`
	Hints      []string `toml:"hints"`
	Prompt     string   `toml:"prompt"`
	TimeTarget string   `toml:"time_target"`
	SayAloud   []string `toml:"say_aloud"`
}

type playlistFile struct {
	Title   string `toml:"title"`
	Focus   string `toml:"focus"`
	Entries []struct {
		Title string `toml:"title"`
		URL   string `toml:"url"`
	} `toml:"entries"`
}

type numberedDir struct {
	number int
	id     string
	path   string
}

func listNumbered(dir string) ([]numberedDir, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var out []numberedDir
	for _, e := range entries {
		m := numbered.FindStringSubmatch(e.Name())
		if !e.IsDir() || m == nil {
			continue
		}
		n, _ := strconv.Atoi(m[1])
		out = append(out, numberedDir{n, m[2], filepath.Join(dir, e.Name())})
	}
	slices.SortFunc(out, func(a, b numberedDir) int { return a.number - b.number })
	return out, nil
}

func Load(root string) (*Catalog, error) {
	c := &Catalog{Root: root, byID: map[string]*Problem{}}
	var errs []error
	report := func(path, format string, args ...any) {
		rel, _ := filepath.Rel(root, path)
		errs = append(errs, fmt.Errorf("%s: %s", rel, fmt.Sprintf(format, args...)))
	}

	modules, err := listNumbered(filepath.Join(root, "curriculum"))
	if err != nil {
		return nil, fmt.Errorf("read curriculum: %w", err)
	}
	for _, md := range modules {
		var mf moduleFile
		if _, err := toml.DecodeFile(filepath.Join(md.path, "module.toml"), &mf); err != nil {
			report(md.path, "module.toml: %v", err)
			continue
		}
		mod := &Module{ID: md.id, Title: mf.Title, Description: mf.Description, Dir: md.path, Number: md.number}
		notes, _ := filepath.Glob(filepath.Join(md.path, "notes", "*.md"))
		slices.Sort(notes)
		mod.Notes = notes
		c.loadTechniques(mod, filepath.Join(md.path, "techniques"), report)
		c.Modules = append(c.Modules, mod)
	}
	c.loadBank(filepath.Join(root, "bank"), report)
	c.Guide = loadGuide(filepath.Join(root, "guide"))

	slices.SortStableFunc(c.Modules, func(a, b *Module) int { return a.Number - b.Number })
	for _, m := range c.Modules {
		for _, t := range m.Techniques {
			for _, p := range t.Problems {
				p.Order = len(c.order)
				c.order = append(c.order, p)
			}
		}
	}

	c.Playlists = loadPlaylists(root, c, report)
	if len(errs) > 0 {
		return nil, errors.Join(errs...)
	}
	return c, nil
}

func (c *Catalog) loadBank(dir string, report func(string, string, ...any)) {
	var bf struct {
		Title string `toml:"title"`
	}
	if _, err := toml.DecodeFile(filepath.Join(dir, "bank.toml"), &bf); err != nil {
		if !os.IsNotExist(err) {
			report(dir, "bank.toml: %v", err)
		}
		return
	}
	bank := &Module{ID: "bank", Title: bf.Title, Dir: dir, Number: 1 << 20, Bank: true}
	c.loadTechniques(bank, dir, report)
	c.Modules = append(c.Modules, bank)
}

func loadGuide(dir string) []GuideNote {
	files, _ := filepath.Glob(filepath.Join(dir, "*.md"))
	slices.Sort(files)
	var out []GuideNote
	for _, f := range files {
		m := numbered.FindStringSubmatch(strings.TrimSuffix(filepath.Base(f), ".md"))
		if m == nil {
			continue
		}
		out = append(out, GuideNote{Title: noteTitle(f, m[2]), Path: f})
	}
	return out
}

// noteTitle is the note's first "# " heading, else its file name in title case.
func noteTitle(path, id string) string {
	if data, err := os.ReadFile(path); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if title, ok := strings.CutPrefix(line, "# "); ok {
				return strings.TrimSpace(title)
			}
		}
	}
	words := strings.Split(id, "_")
	for i, w := range words {
		if w != "" {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

func (c *Catalog) loadTechniques(mod *Module, dir string, report func(string, string, ...any)) {
	techniques, _ := listNumbered(dir)
	for _, td := range techniques {
		var tf techniqueFile
		if _, err := toml.DecodeFile(filepath.Join(td.path, "technique.toml"), &tf); err != nil {
			report(td.path, "technique.toml: %v", err)
			continue
		}
		tech := &Technique{ID: td.id, Title: tf.Title, Number: td.number, Module: mod}
		if tf.Note != "" {
			tech.Note = filepath.Join(mod.Dir, tf.Note)
			if _, err := os.Stat(tech.Note); err != nil {
				report(td.path, "note %s does not exist", tf.Note)
			}
		}
		problems, _ := listNumbered(td.path)
		for _, pd := range problems {
			if p := loadProblem(pd, tech, report); p != nil {
				if prev, dup := c.byID[p.ID]; dup {
					report(pd.path, "duplicate id %q (also %s)", p.ID, prev.Dir)
					continue
				}
				c.byID[p.ID] = p
				tech.Problems = append(tech.Problems, p)
			}
		}
		mod.Techniques = append(mod.Techniques, tech)
	}
}

func loadProblem(pd numberedDir, tech *Technique, report func(string, string, ...any)) *Problem {
	var pf problemFile
	if _, err := toml.DecodeFile(filepath.Join(pd.path, "problem.toml"), &pf); err != nil {
		report(pd.path, "problem.toml: %v", err)
		return nil
	}
	ok := true
	if pf.ID == "" {
		report(pd.path, "missing id")
		ok = false
	}
	diff := Difficulty(pf.Difficulty)
	if _, known := DefaultTimeTargets[diff]; !known {
		report(pd.path, "invalid difficulty %q", pf.Difficulty)
		ok = false
	}
	for _, name := range []string{"starter.py", "test_problem.py"} {
		if _, err := os.Stat(filepath.Join(pd.path, name)); err != nil {
			report(pd.path, "missing %s", name)
			ok = false
		}
	}
	target := DefaultTimeTargets[diff]
	if pf.TimeTarget != "" {
		d, err := time.ParseDuration(pf.TimeTarget)
		if err != nil {
			report(pd.path, "time_target: %v", err)
			ok = false
		}
		target = d
	}
	if !ok {
		return nil
	}
	sayAloud := pf.SayAloud
	if len(sayAloud) == 0 {
		sayAloud = DefaultSayAloud
	}
	_, solErr := os.Stat(filepath.Join(pd.path, "solution.py"))
	return &Problem{
		ID: pf.ID, Title: pf.Title, URL: pf.URL, KeyIdea: pf.KeyIdea, Prompt: pf.Prompt, Dir: pd.path,
		Difficulty: diff, LeetCode: pf.LeetCode, Hints: pf.Hints, SayAloud: sayAloud,
		TimeTarget: target, Number: pd.number, Technique: tech, HasSolution: solErr == nil,
	}
}

func slugOf(url string) string {
	if m := lcSlug.FindStringSubmatch(url); m != nil {
		return m[1]
	}
	return strings.TrimRight(url, "/")
}

func loadPlaylists(root string, c *Catalog, report func(string, string, ...any)) []*Playlist {
	bySlug := map[string]*Problem{}
	for _, p := range c.order {
		if p.URL != "" {
			if _, taken := bySlug[slugOf(p.URL)]; !taken {
				bySlug[slugOf(p.URL)] = p
			}
		}
	}
	files, _ := filepath.Glob(filepath.Join(root, "playlists", "*.toml"))
	slices.Sort(files)
	var out []*Playlist
	for _, f := range files {
		var pf playlistFile
		if _, err := toml.DecodeFile(f, &pf); err != nil {
			report(f, "%v", err)
			continue
		}
		pl := &Playlist{ID: strings.TrimSuffix(filepath.Base(f), ".toml"), Title: pf.Title, Focus: pf.Focus}
		for _, e := range pf.Entries {
			pl.Entries = append(pl.Entries, PlaylistEntry{Title: e.Title, URL: e.URL, Problem: bySlug[slugOf(e.URL)]})
		}
		out = append(out, pl)
	}
	return out
}
