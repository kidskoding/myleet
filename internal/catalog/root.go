package catalog

import (
	"errors"
	"os"
	"path/filepath"
)

func FindRoot(start string) (string, error) {
	if root := os.Getenv("MYLEET_ROOT"); root != "" {
		return root, nil
	}
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if info, err := os.Stat(filepath.Join(dir, "curriculum")); err == nil && info.IsDir() {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("no curriculum/ directory found; run myleet inside the curriculum repo or set MYLEET_ROOT")
		}
		dir = parent
	}
}
