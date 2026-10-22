//go:build windows

package runner

import "os/exec"

// killProcessGroup relies on CommandContext's default Cancel on Windows.
func killProcessGroup(cmd *exec.Cmd) {}
