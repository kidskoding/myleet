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
	Number                      int
	Bank                        bool // problems outside the lessons, reachable from playlists and search
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

// Groups lists playlist groups in the order the playlists screen shows them.
var Groups = []string{"Big tech", "Little tech", "AI labs / high growth", "Quant", "Fortune 500"}

type Playlist struct {
	ID, Title, Group, Focus string
	Entries                 []PlaylistEntry
}

// GuideNote is a start-here note that belongs to no module.
type GuideNote struct{ Title, Path string }

type Catalog struct {
	Root      string
	Guide     []GuideNote
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

// Curriculum is every problem outside the bank.
func (c *Catalog) Curriculum() []*Problem {
	var out []*Problem
	for _, p := range c.order {
		if !p.Technique.Module.Bank {
			out = append(out, p)
		}
	}
	return out
}

func (c *Catalog) LibDir() string { return filepath.Join(c.Root, "curriculum", "_lib") }
