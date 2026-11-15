# Plan: rust-catalog-config-validate

**Spec**: .planning/specs/rust-catalog-config-validate.md
**Epic**: rust-rewrite (feature 2)
**Created**: 2026-11-14
**Status**: draft

______________________________________________________________________

## Architecture

The modules mirror the Go packages, so the port maps one to one and the Go file stays the
reference.

| Component       | Type   | Purpose                                                                    |
| --------------- | ------ | -------------------------------------------------------------------------- |
| `godur`         | module | Go `time.ParseDuration` subset                                             |
| `catalog`       | module | model + `problem`/`problems`/`curriculum`/`ids`                            |
| `catalog::load` | module | directory walk, TOML decode, error collection, playlists                   |
| `catalog::lock` | module | `read_lock` / `write_lock`                                                 |
| `catalog::root` | module | `find_root` (env passed in, so tests need not set env vars)                |
| `config`        | module | config file, XDG paths, state dir                                          |
| `cli`           | module | `run()` dispatch (moved out of `main.rs`), `Term` writer with a color flag |
| `cli::validate` | module | the `validate` command                                                     |

Ownership: `Catalog` owns `modules: Vec<Module>` and `problems: Vec<Problem>` in final
order. `Technique.problems` holds indices into `Catalog.problems`, and a `Problem` holds its
`module` and `technique` indices. Modules load in number order with the bank last, so load
order equals final order, and `order` is the push index.

### New files

| File                                      | Location       | Purpose                            |
| ----------------------------------------- | -------------- | ---------------------------------- |
| `godur.rs`                                | `src/`         | duration parser + tests            |
| `mod.rs`, `load.rs`, `lock.rs`, `root.rs` | `src/catalog/` | catalog port + tests               |
| `config.rs`                               | `src/`         | config port + tests                |
| `mod.rs`, `validate.rs`                   | `src/cli/`     | dispatch, `Term`, validate + tests |

### Files to change

| File          | What changes                                               | Why                                       |
| ------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `Cargo.toml`  | add `serde`, `toml`; dev `tempfile`                        | TOML decoding, temp copies for lock tests |
| `src/main.rs` | becomes `cli::run` with real stdout/stderr and color flags | dispatch moves to `cli`                   |

______________________________________________________________________

## Tasks

### Phase 1: building blocks (parallel)

| #   | Task                         | Files                         | Test                |
| --- | ---------------------------- | ----------------------------- | ------------------- |
| 1   | Duration parser, tests first | `src/godur.rs`                | `cargo test godur`  |
| 2   | Config, tests first          | `src/config.rs`, `Cargo.toml` | `cargo test config` |

### Phase 2: catalog (depends on 1)

| #   | Task                                                        | Files              | Test                 |
| --- | ----------------------------------------------------------- | ------------------ | -------------------- |
| 3   | Model, loader, root, lock; tests ported from `load_test.go` | `src/catalog/*.rs` | `cargo test catalog` |

### Phase 3: command (depends on 2, 3)

| #   | Task                                                                                                   | Files                         | Test                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------- |
| 4   | `cli` dispatch + `validate`; tests ported from `cli_test.go` (good, bad, lock gone, `--lock`, new ids) | `src/cli/*.rs`, `src/main.rs` | `cargo test cli`; real-repo parity vs `go run ./cmd/myleet validate` |

| Parallel group | Tasks | Why         |
| -------------- | ----- | ----------- |
| A              | 1, 2  | independent |

| Sequential | Depends on | Why                     |
| ---------- | ---------- | ----------------------- |
| 3          | 1          | `time_target` parsing   |
| 4          | 2, 3       | uses catalog and config |

______________________________________________________________________

## Testing plan

Each spec testing criterion maps to a unit test in the module it covers. Lock tests copy
`internal/catalog/testdata/good` into a `tempfile::TempDir`, so the fixtures are never
written. Real-repo parity runs once by hand (Go and Rust `validate` output compared), plus
a unit test that loads the real repo and checks every locked id. The data layer is the
TOML loader (covered); there is no business API or UI.

## Gate 2

- [x] Mirrors the Go package layout and the existing `run()` dispatch
- [x] All new and changed files listed
- [x] Tasks small, dependencies and parallel groups marked
- [x] Every spec edge case has a test
