# Spec: rust-crate-scaffold

**Created**: 2026-11-14
**Status**: draft
**Author**: Anirudh Konidala
**Epic**: rust-rewrite (feature 1)

---

## Problem

The rewrite has no Rust project yet, so no later feature has anywhere to land and nothing
checks Rust code on push. Without a pinned toolchain and a CI job from day one, ported code
can drift into nightly-only features or unformatted, lint-failing code that piles up before
anyone notices.

## Goal

A Rust binary `myleet-rs` builds from the repo root next to the Go build, `myleet-rs version`
prints version metadata like `myleet version` does, and CI runs `cargo fmt --check`,
`cargo clippy -D warnings` and `cargo test` on every push. The Go build and its CI steps are
unchanged.

## User Stories

- As the maintainer porting myleet, I want a Rust crate that builds and is checked in CI, so
  each later feature is only its own port and not project setup.
- As a learner still using the Go trainer, I want `go install ./cmd/myleet` and the Go CI to
  keep working unchanged, so my daily practice is not interrupted.

## Requirements

### Must-have
- Root `Cargo.toml`: package `myleet`, `edition = "2024"`, `rust-version = "1.85"`,
  `license = "MIT"`, one `[[bin]]` named `myleet-rs` at `src/main.rs`.
- `rust-toolchain.toml` pinning `channel = "stable"` with `rustfmt` and `clippy`.
- `src/main.rs` with `myleet-rs version` / `-v` / `--version` printing
  `myleet <version> (<commit>, <date>)`. Version comes from `MYLEET_VERSION`,
  `MYLEET_COMMIT` and `MYLEET_DATE` at build time (`option_env!`), with the same fallbacks
  as `internal/version` (`dev`, `none`, `unknown`), and `myleet (dev)` when version is
  `dev` and commit is `none`, exactly like `version.String()`. Any other argument prints that the
  command is not ported yet and exits 2.
- `Cargo.lock` committed (this is a binary).
- `target/` added to `.gitignore`.
- New `rust` job in `.github/workflows/ci.yml`: checkout, install the toolchain from
  `rust-toolchain.toml`, cache, then `cargo fmt --check`,
  `cargo clippy --all-targets -- -D warnings`, `cargo test`.
- `Makefile` targets `rs-build` and `rs-test`.

### Nice-to-have
- `rust` and `cargo` added to the flake `devShell`.

### Out of scope
- Any ported package (catalog, progress, TUI and so on). Each is its own epic feature.
- Empty placeholder modules for future ports: modules arrive with the code that fills them.
- `clap`, `ratatui` or other dependencies. They come with the features that use them.
- Release workflow, install script and flake `packages` changes (feature 13).

## Data Model

None. No state files are read or written.

## API Changes

None. The CLI surface is only `myleet-rs version`.

## UI Changes

None.

## Edge Cases

1. **No build env vars set** (plain `cargo build`): version prints `myleet (dev)`,
   matching the Go fallback.
2. **Unknown or ported-later command** (`myleet-rs validate`): prints
   `myleet-rs: "validate" is not ported yet; use myleet` to stderr and exits 2. It does not
   panic or silently succeed.
3. **No arguments**: same message as edge case 2 for the TUI, exit 2. It does not open a
   half-built screen.
4. **Local nix nightly toolchain**: `rust-toolchain.toml` is ignored without rustup. The
   crate must still build on nightly 1.101 (no stable-only assumptions), and CI catches
   any nightly-only use.
5. **Go CI untouched**: the existing `quality` job must not gain a Rust dependency, so a
   Rust failure never hides a Go or curriculum failure.

## Testing Criteria

### Happy path
- `cargo test`: a unit test checks the version string format with all three values set.
- A unit test of `run()` in `src/main.rs` calls `version` and asserts exit 0 and a
  `myleet ` prefix. (No top-level `tests/` folder: `CLAUDE.md` forbids one.)

### Edge cases
- A unit test checks the fallback when values are missing: `myleet (dev)`.
- A unit test of `run()` calls `validate` and no arguments: exit 2 and stderr mentions
  "not ported yet".
- `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` pass locally.
- `go test ./internal/tui/...` and `go vet ./...` still pass (Go untouched).

## Dependencies

- Rust toolchain (local: nix nightly 1.101; CI: stable via `rust-toolchain.toml`).
- GitHub Actions: `dtolnay/rust-toolchain` or an equivalent that reads the toolchain file,
  plus `Swatinem/rust-cache`.
- No crate dependencies.
