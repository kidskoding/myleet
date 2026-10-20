package cli

import (
	"io"
	"os"

	"github.com/charmbracelet/colorprofile"

	"github.com/kidskoding/myleet/internal/theme"
)

var th = theme.New()

// colorWriter strips colors when piped or when NO_COLOR is set.
func colorWriter(w io.Writer) io.Writer {
	if cw, ok := w.(*colorprofile.Writer); ok {
		return cw
	}
	return colorprofile.NewWriter(w, os.Environ())
}

func okTag() string   { return th.Pass.Render("ok  ") }
func failTag() string { return th.Fail.Render("FAIL") }
