package config

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/BurntSushi/toml"
)

type Config struct {
	Python    string
	Editor    string
	Timeout   time.Duration
	NewPerDay int
	StateDir  string // where progress.toml and events.jsonl live; empty means DataDir
}

type fileConfig struct {
	Python    string   `toml:"python"`
	Editor    string   `toml:"editor"`
	Timeout   duration `toml:"timeout"`
	NewPerDay int      `toml:"new_per_day"`
	StateDir  string   `toml:"state_dir"`
}

type duration struct{ time.Duration }

func (d *duration) UnmarshalText(text []byte) error {
	parsed, err := time.ParseDuration(string(text))
	if err != nil {
		return fmt.Errorf("timeout: %w", err)
	}
	d.Duration = parsed
	return nil
}

func Default() Config {
	return Config{Timeout: 10 * time.Second, NewPerDay: 3}
}

func Load() (Config, error) {
	c, err := LoadFile(Path())
	if errors.Is(err, fs.ErrNotExist) {
		return Default(), nil
	}
	return c, err
}

func LoadFile(path string) (Config, error) {
	var raw fileConfig
	if _, err := toml.DecodeFile(path, &raw); err != nil {
		return Default(), err
	}
	c := Default()
	c.Python = raw.Python
	c.Editor = raw.Editor
	c.StateDir = raw.StateDir
	if raw.Timeout.Duration > 0 {
		c.Timeout = raw.Timeout.Duration
	}
	if raw.NewPerDay > 0 {
		c.NewPerDay = raw.NewPerDay
	}
	return c, nil
}

// StateDirPath is state_dir from the config (~ expanded), else the data dir.
func (c Config) StateDirPath() string {
	if c.StateDir == "" {
		return DataDir()
	}
	if c.StateDir == "~" || strings.HasPrefix(c.StateDir, "~/") {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, strings.TrimPrefix(c.StateDir, "~"))
		}
	}
	return c.StateDir
}

func Path() string {
	return filepath.Join(xdg("XDG_CONFIG_HOME", ".config"), "myleet", "config.toml")
}

func DataDir() string {
	return filepath.Join(xdg("XDG_DATA_HOME", filepath.Join(".local", "share")), "myleet")
}

func xdg(env, fallback string) string {
	if dir := os.Getenv(env); dir != "" {
		return dir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	return filepath.Join(home, fallback)
}
