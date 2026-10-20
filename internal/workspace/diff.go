package workspace

import (
	"os"
	"path/filepath"

	"github.com/aymanbagabas/go-udiff"
)

func Diff(oldPath, newPath string) (string, error) {
	before, err := os.ReadFile(oldPath)
	if err != nil {
		return "", err
	}
	after, err := os.ReadFile(newPath)
	if err != nil {
		return "", err
	}
	return udiff.Unified(filepath.Base(oldPath), "current", string(before), string(after)), nil
}
