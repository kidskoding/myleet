.PHONY: install build test vet validate doctor check release clean

PREFIX  ?= $(shell go env GOPATH)
BINDIR  ?= $(PREFIX)/bin
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
DATE    ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS := -s -w \
	-X github.com/kidskoding/myleet/internal/version.Version=$(VERSION) \
	-X github.com/kidskoding/myleet/internal/version.Commit=$(COMMIT) \
	-X github.com/kidskoding/myleet/internal/version.Date=$(DATE)

install: ## install myleet into GOPATH/bin with version metadata
	go install -ldflags "$(LDFLAGS)" ./cmd/myleet

build: ## build ./myleet in the current directory
	go build -ldflags "$(LDFLAGS)" -o myleet ./cmd/myleet

test: ## run Go tests
	go test ./...

vet: ## go vet
	go vet ./...

validate: ## load curriculum + playlists
	go run ./cmd/myleet validate

doctor: install ## install then run doctor
	myleet doctor

check: ## run reference solutions against tests (slow)
	go run ./cmd/myleet check --solutions

release: ## goreleaser snapshot (needs goreleaser installed)
	goreleaser release --snapshot --clean

clean:
	rm -f myleet
	rm -rf dist/
