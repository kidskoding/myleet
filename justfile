version := `git describe --tags --always --dirty 2>/dev/null || echo dev`
commit := `git rev-parse --short HEAD 2>/dev/null || echo none`
date := `date -u +%Y-%m-%dT%H:%M:%SZ`
meta := "MYLEET_VERSION=" + version + " MYLEET_COMMIT=" + commit + " MYLEET_DATE=" + date

# list recipes
default:
    @just --list

# install myleet into ~/.cargo/bin with version metadata
install:
    {{meta}} cargo install --path . --locked

# build target/release/myleet
build:
    {{meta}} cargo build --release --locked

# fmt, clippy, and test
test:
    cargo fmt --check
    cargo clippy --workspace --all-targets -- -D warnings
    cargo test --workspace

# load curriculum + playlists
validate:
    cargo run --release -- validate

# run reference solutions against tests (slow)
check:
    cargo run --release -- check --solutions

# install then run doctor
doctor: install
    myleet doctor

clean:
    cargo clean
