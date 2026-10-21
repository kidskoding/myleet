package main

import (
	"os"

	"github.com/kidskoding/myleet/internal/cli"
	"github.com/kidskoding/myleet/internal/tui"
)

// Version metadata is injected via -ldflags (see Makefile / .goreleaser.yaml).
func main() {
	cli.StartTUI = tui.Run
	os.Exit(cli.Main(os.Args[1:]))
}
