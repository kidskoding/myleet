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

# every check CI runs (.github/workflows/ci.yml); run before pushing
ci: ci-rust ci-web ci-content ci-python

ci-rust:
    cargo fmt --check
    cargo clippy --workspace --all-targets -- -D warnings
    cargo test --workspace
    cargo check -p myleet-core -p myleet-wasm --target wasm32-unknown-unknown
    cargo fmt --check --manifest-path worker/Cargo.toml
    cargo clippy --manifest-path worker/Cargo.toml --all-targets -- -D warnings
    cargo clippy --manifest-path worker/Cargo.toml --target wasm32-unknown-unknown -- -D warnings
    cargo test --manifest-path worker/Cargo.toml

ci-web: web-build
    cd web && bun run test

ci-content:
    cargo run --release -- validate
    cargo run --release -- check --solutions

ci-python:
    uv run ruff check .
    uv run ruff format --check .
    uv run ty check
    uv run pytest
    find . -path './.git' -prune -o -path './.venv' -prune -o -path './.pytest_cache' -prune -o -path './target' -prune -o -path '*/node_modules' -prune -o -path './worker/target' -prune -o -path './web/dist' -prune -o -path './web/src/wasm' -prune -o -path './web/public/data' -prune -o -path './.planning' -prune -o -path './.handoff' -prune -o -name '*.md' -type f -print | xargs -r uv run mdformat --check

# what the Deploy workflow builds, without deploying (needs worker-build)
cd-check: web-build
    cd worker && bun install --frozen-lockfile && bunx wrangler deploy --dry-run

# write the catalog JSON the web app loads into web/public/data
export:
    cargo run --release -- export web/public/data

# build the browser bindings into web/src/wasm (needs wasm-pack and the wasm32 target)
wasm:
    wasm-pack build crates/wasm --target web --out-dir ../../web/src/wasm

# web app dev server, after fresh catalog data and wasm bindings
web-dev: export wasm
    cd web && bun install --frozen-lockfile && bun run dev

# the whole site and API on http://localhost:8787 with a local database, signed in as the demo
# learner (tools/demo/seed.py, reset on every run). Sign out to test as a guest; the sign-in page
# then offers the demo learner again, and with no email key other sign-in links print here.
# Edits need a rerun (use web-dev for quick UI work). Fire the LeetCode cron with:
#   curl -X POST 'http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=myleet' -H 'content-type: application/json' -d '{"cron":"0 */3 * * *"}'
dev: web-build
    cd worker && bun install --frozen-lockfile && ([ -f .dev.vars ] || cp .dev.vars.example .dev.vars) && bunx wrangler d1 migrations apply DB --local
    uv run python tools/demo/seed.py web/public/data/catalog.json worker/.wrangler/demo.sql
    cd worker && bunx wrangler d1 execute DB --local --file .wrangler/demo.sql
    # Serves a private copy of the site, so a rebuild of web/dist (CI checks, another session)
    # can't pull files out from under the running server.
    rm -rf worker/.wrangler/site && cp -r web/dist worker/.wrangler/site
    (until curl -sf -o /dev/null http://localhost:8787/api/auth/providers; do sleep 1; done; xdg-open http://localhost:8787/api/auth/demo >/dev/null 2>&1 || open http://localhost:8787/api/auth/demo) &
    cd worker && bunx wrangler dev --port 8787 --assets .wrangler/site

# static site in web/dist (type check + build), after fresh catalog data and wasm bindings
web-build: export wasm
    cd web && bun install --frozen-lockfile && bun run build

# install then run doctor
doctor: install
    myleet doctor

clean:
    cargo clean
