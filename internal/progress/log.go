package progress

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type Log struct {
	path string
	mu   sync.Mutex
}

// Open turns unreadable lines into warnings so one corrupt line cannot lock the
// learner out of their history.
func Open(path string) (*Log, []Event, []error) {
	log := &Log{path: path}
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return log, nil, nil
		}
		return log, nil, []error{err}
	}
	defer f.Close()
	var events []Event
	var warns []error
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	line := 0
	for scanner.Scan() {
		line++
		if len(scanner.Bytes()) == 0 {
			continue
		}
		var e Event
		if err := json.Unmarshal(scanner.Bytes(), &e); err != nil {
			warns = append(warns, fmt.Errorf("%s:%d: skipped unreadable event: %v", path, line, err))
			continue
		}
		events = append(events, e)
	}
	if err := scanner.Err(); err != nil {
		warns = append(warns, err)
	}
	return log, events, warns
}

func (l *Log) Append(e Event) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if err := os.MkdirAll(filepath.Dir(l.path), 0o755); err != nil {
		return err
	}
	data, err := json.Marshal(e)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := f.Write(append(data, '\n')); err != nil {
		return err
	}
	return f.Sync()
}

func (l *Log) Replace(events []Event, backup string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if backup != "" {
		if data, err := os.ReadFile(l.path); err == nil {
			if err := os.WriteFile(backup, data, 0o644); err != nil {
				return err
			}
		}
	}
	tmp, err := os.CreateTemp(filepath.Dir(l.path), ".events-*")
	if err != nil {
		return err
	}
	enc := json.NewEncoder(tmp)
	for _, e := range events {
		if err := enc.Encode(e); err != nil {
			tmp.Close()
			os.Remove(tmp.Name())
			return err
		}
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), l.path)
}

func (l *Log) Path() string { return l.path }
