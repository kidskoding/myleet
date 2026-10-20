package catalog

import (
	"path/filepath"
	"time"
)

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

func (d Difficulty) Short() string {
	if d == Medium {
		return "med"
	}
	return string(d)
}

var DefaultTimeTargets = map[Difficulty]time.Duration{
	Easy:   15 * time.Minute,
	Medium: 30 * time.Minute,
	Hard:   45 * time.Minute,
}

var DefaultSayAloud = []string{"brute force", "why it dies", "complexity"}

type Module struct {
	ID, Title, Description, Dir string
	Number, Priority            int
	Notes                       []string
	Techniques                  []*Technique
}

type Technique struct {
	ID, Title, Note string
	Number          int
	Module          *Module
	Problems        []*Problem
}

type Problem struct {
	ID, Title, URL, KeyIdea, Prompt, Dir string
	Difficulty                           Difficulty
	LeetCode                             int
	Hints, SayAloud                      []string
	TimeTarget                           time.Duration
	Number, Order                        int
	Technique                            *Technique
	HasSolution                          bool
}

func (p *Problem) StarterPath() string  { return filepath.Join(p.Dir, "starter.py") }
func (p *Problem) TestPath() string     { return filepath.Join(p.Dir, "test_problem.py") }
func (p *Problem) SolutionPath() string { return filepath.Join(p.Dir, "solution.py") }

type PlaylistEntry struct {
	Title, URL string
	Problem    *Problem
}

type Playlist struct {
	ID, Title, Focus string
	Entries          []PlaylistEntry
}

type Catalog struct {
	Root      string
	Modules   []*Module
	Playlists []*Playlist

	byID  map[string]*Problem
	order []*Problem
}

func (c *Catalog) Problem(id string) (*Problem, bool) {
	p, ok := c.byID[id]
	return p, ok
}

func (c *Catalog) Problems() []*Problem { return c.order }

func (c *Catalog) LibDir() string { return filepath.Join(c.Root, "curriculum", "_lib") }
