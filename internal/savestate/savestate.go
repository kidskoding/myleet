// Package savestate reads and writes progress.toml, the learner's save file. It is
// the scheduling source of truth and is meant to be edited by hand.
package savestate

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/BurntSushi/toml"

	"github.com/kidskoding/myleet/internal/catalog"
	"github.com/kidskoding/myleet/internal/schedule"
)

const header = `# myleet save file. You can edit this file by hand:
#   - delete a [problem] block to reset that problem
#   - change due = YYYY-MM-DD to move its next review
#   - set rung to 1d, 3d, 7d, 14d or 30d (14d and 30d count as mastered)
# myleet checks this file on start and will not overwrite it while it is broken.
`

type entry struct {
	Rung        string    `toml:"rung"`
	Due         time.Time `toml:"due"`
	Last        time.Time `toml:"last"`
	First       time.Time `toml:"first"`
	Attempts    int       `toml:"attempts"`
	CleanPasses int       `toml:"clean_passes"`
	Best        string    `toml:"best"`
}

func rungIndex(label string) (int, bool) {
	for i, days := range schedule.Rungs {
		if label == fmt.Sprintf("%dd", days) {
			return i, true
		}
	}
	return -1, false
}

func day(t time.Time, loc *time.Location) time.Time {
	if t.IsZero() {
		return time.Time{}
	}
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

// Read parses the save file. A missing file returns an os.IsNotExist error.
func Read(path string, loc *time.Location) (map[string]schedule.State, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var raw map[string]entry
	if _, err := toml.Decode(string(data), &raw); err != nil {
		var perr toml.ParseError
		if errors.As(err, &perr) {
			return nil, fmt.Errorf("%s line %d: %s", path, perr.Position.Line, perr.Message)
		}
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	states := make(map[string]schedule.State, len(raw))
	for id, e := range raw {
		rung, ok := rungIndex(e.Rung)
		if !ok {
			return nil, fmt.Errorf("%s: [%s] rung %q must be one of 1d, 3d, 7d, 14d, 30d", path, id, e.Rung)
		}
		if e.Last.IsZero() {
			return nil, fmt.Errorf("%s: [%s] needs last = YYYY-MM-DD", path, id)
		}
		st := schedule.State{
			Status: schedule.StatusFor(rung), Rung: rung,
			LastFinished: day(e.Last, loc), FirstFinished: day(e.First, loc), Due: day(e.Due, loc),
			Attempts: e.Attempts, CleanPasses: e.CleanPasses,
		}
		if st.FirstFinished.IsZero() {
			st.FirstFinished = st.LastFinished
		}
		if st.Due.IsZero() {
			st.Due = st.LastFinished.AddDate(0, 0, schedule.Rungs[rung])
		}
		if e.Best != "" {
			best, err := time.ParseDuration(e.Best)
			if err != nil {
				return nil, fmt.Errorf("%s: [%s] best %q is not a duration like 4m12s", path, id, e.Best)
			}
			st.BestElapsed = best
		}
		states[id] = st
	}
	return states, nil
}

// Write keeps ids missing from the catalog (written last) so hand edits are never lost.
func Write(path string, c *catalog.Catalog, states map[string]schedule.State, loc *time.Location) error {
	var ids []string
	seen := map[string]bool{}
	for _, p := range c.Problems() {
		ids = append(ids, p.ID)
		seen[p.ID] = true
	}
	var unknown []string
	for id := range states {
		if !seen[id] {
			unknown = append(unknown, id)
		}
	}
	slices.Sort(unknown)
	ids = append(ids, unknown...)

	var b strings.Builder
	b.WriteString(header)
	for _, id := range ids {
		st, ok := states[id]
		if !ok || st.Rung < 0 {
			continue
		}
		fmt.Fprintf(&b, "\n[%s]\n", id)
		fmt.Fprintf(&b, "rung = \"%dd\"\n", schedule.Rungs[st.Rung])
		fmt.Fprintf(&b, "due = %s\n", st.Due.In(loc).Format(time.DateOnly))
		fmt.Fprintf(&b, "last = %s\n", st.LastFinished.In(loc).Format(time.DateOnly))
		if !st.FirstFinished.IsZero() {
			fmt.Fprintf(&b, "first = %s\n", st.FirstFinished.In(loc).Format(time.DateOnly))
		}
		fmt.Fprintf(&b, "attempts = %d\n", st.Attempts)
		fmt.Fprintf(&b, "clean_passes = %d\n", st.CleanPasses)
		if st.BestElapsed > 0 {
			fmt.Fprintf(&b, "best = %q\n", st.BestElapsed.Round(time.Second).String())
		}
	}
	return writeAtomic(path, b.String())
}

func writeAtomic(path, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".progress-*")
	if err != nil {
		return err
	}
	if _, err := tmp.WriteString(content); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), path)
}
