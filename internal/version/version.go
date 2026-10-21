// Package version holds the build identity injected by ldflags / goreleaser.
package version

// Version is the semver tag (e.g. "0.1.0") or "dev" for local builds.
var Version = "dev"

// Commit is the short git SHA, or "none".
var Commit = "none"

// Date is the build date (UTC), or "unknown".
var Date = "unknown"

// String returns a one-line identity for --version and doctor.
func String() string {
	if Version == "dev" && Commit == "none" {
		return "myleet (dev)"
	}
	return "myleet " + Version + " (" + Commit + ", " + Date + ")"
}
