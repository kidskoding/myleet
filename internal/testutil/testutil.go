package testutil

import (
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/kidskoding/myleet/internal/catalog"
)

var Chicago, _ = time.LoadLocation("America/Chicago")

func GoodRoot() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "catalog", "testdata", "good")
}

func GoodCatalog(t testing.TB) *catalog.Catalog {
	t.Helper()
	c, err := catalog.Load(GoodRoot())
	if err != nil {
		t.Fatal(err)
	}
	return c
}

// Day returns local Chicago noon on 2026-10-<day>.
func Day(day int) time.Time {
	return time.Date(2026, 10, day, 12, 0, 0, 0, Chicago)
}

func Midnight(day int) time.Time {
	return time.Date(2026, 10, day, 0, 0, 0, 0, Chicago)
}
