//go:build unix

package runner

import (
	"os/exec"
	"syscall"
)

// killProcessGroup kills the pytest process and any children on cancel/timeout.
func killProcessGroup(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
}
