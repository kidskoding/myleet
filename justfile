version := `git describe --tags --always --dirty 2>/dev/null || echo dev`
commit := `git rev-parse --short HEAD 2>/dev/null || echo none`
date := `date -u +%Y-%m-%dT%H:%M:%SZ`
pkg := "github.com/kidskoding/myleet/internal/version"
ldflags := "-s -w -X " + pkg + ".Version=" + version + " -X " + pkg + ".Commit=" + commit + " -X " + pkg + ".Date=" + date

# list recipes
default:
    @just --list

# install myleet into GOPATH/bin with version metadata
install:
    go install -ldflags "{{ldflags}}" ./cmd/myleet

# build ./myleet in the current directory
build:
    go build -ldflags "{{ldflags}}" -o myleet ./cmd/myleet

# run Go tests
test:
    go test ./...

# go vet
vet:
    go vet ./...

# load curriculum + playlists
validate:
    go run ./cmd/myleet validate

# install then run doctor
doctor: install
    myleet doctor

# run reference solutions against tests (slow)
check:
    go run ./cmd/myleet check --solutions

# goreleaser snapshot (needs goreleaser installed)
release:
    goreleaser release --snapshot --clean

# build the Rust port (target/release/myleet-rs)
rs-build:
    MYLEET_VERSION={{version}} MYLEET_COMMIT={{commit}} MYLEET_DATE={{date}} cargo build --release

# fmt, clippy, and test the Rust port
rs-test:
    cargo fmt --check
    cargo clippy --all-targets -- -D warnings
    cargo test

clean:
    rm -f myleet
    rm -rf dist/
