package watch

import (
	"context"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

// File watches the parent directory because many editors save by renaming a temp
// file over the original, which replaces the watched inode.
func File(ctx context.Context, path string, debounce time.Duration) (<-chan struct{}, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	if err := w.Add(filepath.Dir(path)); err != nil {
		w.Close()
		return nil, err
	}
	name := filepath.Base(path)
	out := make(chan struct{}, 1)
	go func() {
		defer w.Close()
		defer close(out)
		var timer *time.Timer
		var fire <-chan time.Time
		for {
			select {
			case <-ctx.Done():
				return
			case ev, ok := <-w.Events:
				if !ok {
					return
				}
				if filepath.Base(ev.Name) != name || !ev.Has(fsnotify.Write|fsnotify.Create|fsnotify.Rename) {
					continue
				}
				if timer == nil {
					timer = time.NewTimer(debounce)
				} else {
					timer.Reset(debounce)
				}
				fire = timer.C
			case <-fire:
				fire = nil
				select {
				case out <- struct{}{}:
				default:
				}
			case _, ok := <-w.Errors:
				if !ok {
					return
				}
			}
		}
	}()
	return out, nil
}
