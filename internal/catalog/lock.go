package catalog

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// LockFile lists every published problem id. Saved progress is keyed by id, so an id
// that vanishes from the catalog would orphan it; validate fails until the lock agrees.
const LockFile = "problem-ids.lock"

func ReadLock(root string) ([]string, error) {
	data, err := os.ReadFile(filepath.Join(root, LockFile))
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return strings.Fields(string(data)), nil
}

func WriteLock(root string, ids []string) error {
	return os.WriteFile(filepath.Join(root, LockFile), []byte(strings.Join(ids, "\n")+"\n"), 0o644)
}

func (c *Catalog) IDs() []string {
	ids := make([]string, 0, len(c.byID))
	for id := range c.byID {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}
