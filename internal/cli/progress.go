package cli

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/kidskoding/myleet/internal/app"
	"github.com/kidskoding/myleet/internal/config"
	"github.com/kidskoding/myleet/internal/editor"
	"github.com/kidskoding/myleet/internal/savestate"
)

func saveFilePath() (string, config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return "", cfg, err
	}
	return filepath.Join(cfg.StateDirPath(), app.SaveFile), cfg, nil
}

// editProgress skips app.Load so it still works when the save file is broken.
func editProgress(stdout, stderr io.Writer) int {
	path, cfg, err := saveFilePath()
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		if _, err := app.Load(io.Discard); err != nil {
			fmt.Fprintln(stderr, "myleet:", err)
			return 1
		}
	}
	before, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	_, beforeErr := savestate.Read(path, time.Local)

	cmd, err := editor.Command(cfg, path)
	if err != nil {
		fmt.Fprintln(stderr, "myleet:", err)
		return 1
	}
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Fprintln(stderr, "myleet: editor:", err)
		return 1
	}

	if _, err := savestate.Read(path, time.Local); err != nil {
		fmt.Fprintln(stdout, failTag()+"  "+th.Fail.Render(err.Error()))
		if beforeErr == nil {
			if werr := os.WriteFile(path, before, 0o644); werr != nil {
				fmt.Fprintln(stderr, "myleet: could not restore:", werr)
				return 1
			}
			fmt.Fprintln(stdout, th.Due.Render("restored the previous version; run `myleet progress` to try again"))
		} else {
			fmt.Fprintln(stdout, th.Due.Render("the file is still broken; run `myleet progress` to fix it"))
		}
		return 1
	}
	fmt.Fprintf(stdout, "%s  saved %s\n", okTag(), th.Muted.Render(path))
	return 0
}
