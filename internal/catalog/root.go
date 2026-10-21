package catalog

import (
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	// DefaultRepo is cloned when myleet is installed without a local checkout.
	DefaultRepo = "https://github.com/kidskoding/myleet.git"
	// ContentDirName is the curriculum checkout under the XDG data directory.
	ContentDirName = "content"
)

func isRoot(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, "curriculum"))
	return err == nil && info.IsDir()
}

// ContentDir is where a go-install / release binary keeps its curriculum clone.
func ContentDir(dataDir string) string {
	return filepath.Join(dataDir, ContentDirName)
}

// FindRoot walks up from start for a curriculum/ directory, or honors MYLEET_ROOT.
func FindRoot(start string) (string, error) {
	if root := os.Getenv("MYLEET_ROOT"); root != "" {
		if !isRoot(root) {
			return "", fmt.Errorf("MYLEET_ROOT=%s has no curriculum/ directory", root)
		}
		return root, nil
	}
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if isRoot(dir) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("no curriculum/ directory found; run myleet inside the repo, set MYLEET_ROOT, or let myleet install the curriculum")
		}
		dir = parent
	}
}

// EnsureRoot finds the curriculum, falling back to a clone under dataDir/content.
// For the installed copy it also ensures a python env (uv sync) so tests work
// after a plain `go install` + `myleet` with no manual setup.
func EnsureRoot(start, dataDir string, warn io.Writer) (string, error) {
	if root, err := FindRoot(start); err == nil {
		return root, nil // local checkout: leave the venv to the developer
	} else if os.Getenv("MYLEET_ROOT") != "" {
		return "", err // explicit root must not be replaced by a clone
	}
	content := ContentDir(dataDir)
	if !isRoot(content) {
		if warn != nil {
			fmt.Fprintf(warn, "myleet: no local curriculum found; cloning into %s\n", content)
		}
		if err := BootstrapContent(content, DefaultRepo); err != nil {
			return "", fmt.Errorf("install curriculum: %w\nfix: clone https://github.com/kidskoding/myleet and run from that directory, or set MYLEET_ROOT", err)
		}
	}
	if err := ensureVenv(content, warn); err != nil && warn != nil {
		fmt.Fprintf(warn, "myleet: %v\n", err)
		fmt.Fprintf(warn, "myleet: install uv (https://docs.astral.sh/uv/), then re-run myleet\n")
	}
	return content, nil
}

func hasVenv(root string) bool {
	_, err := os.Stat(filepath.Join(root, ".venv", "bin", "python"))
	return err == nil
}

// ensureVenv runs uv sync when the installed tree has no .venv yet.
func ensureVenv(root string, warn io.Writer) error {
	if hasVenv(root) {
		return nil
	}
	if _, err := os.Stat(filepath.Join(root, "pyproject.toml")); err != nil {
		return nil // incomplete tree (tests); nothing to sync
	}
	return SyncDeps(root, warn)
}

// SyncDeps installs project deps (pytest) into root/.venv via uv.
func SyncDeps(root string, warn io.Writer) error {
	uv, err := exec.LookPath("uv")
	if err != nil {
		return errors.New("uv is required for problem tests")
	}
	if warn != nil {
		fmt.Fprintf(warn, "myleet: setting up python env...\n")
	}
	cmd := exec.Command(uv, "sync", "--directory", root)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("uv sync failed: %w", err)
	}
	return nil
}

// BootstrapContent shallow-clones repoURL into dest.
func BootstrapContent(dest, repoURL string) error {
	if isRoot(dest) {
		return nil
	}
	if _, err := exec.LookPath("git"); err != nil {
		return errors.New("git is required to download the curriculum")
	}
	parent := filepath.Dir(dest)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return err
	}
	tmp := dest + ".partial"
	os.RemoveAll(tmp)
	cmd := exec.Command("git", "clone", "--depth", "1", "--single-branch", repoURL, tmp)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		os.RemoveAll(tmp)
		return err
	}
	if err := os.Rename(tmp, dest); err != nil {
		os.RemoveAll(tmp)
		return err
	}
	return nil
}

// UpdateContent runs git pull --ff-only in an existing content checkout.
func UpdateContent(content string) error {
	if !isRoot(content) {
		return fmt.Errorf("%s is not a myleet curriculum checkout", content)
	}
	cmd := exec.Command("git", "-C", content, "pull", "--ff-only")
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return err
	}
	return nil
}

// RootKind describes how the curriculum was resolved (for doctor).
func RootKind(root, dataDir string) string {
	if env := os.Getenv("MYLEET_ROOT"); env != "" && samePath(env, root) {
		return "MYLEET_ROOT"
	}
	if samePath(root, ContentDir(dataDir)) {
		return "installed content"
	}
	return "local checkout"
}

func samePath(a, b string) bool {
	aa, err1 := filepath.Abs(a)
	bb, err2 := filepath.Abs(b)
	if err1 != nil || err2 != nil {
		return filepath.Clean(a) == filepath.Clean(b)
	}
	return aa == bb || strings.EqualFold(aa, bb)
}
