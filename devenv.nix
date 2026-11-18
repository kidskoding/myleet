{pkgs, ...}: {
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = ["wasm32-unknown-unknown"];
    components = ["rustc" "cargo" "clippy" "rustfmt" "rust-analyzer"];
  };

  languages.javascript = {
    enable = true;
    bun.enable = true;
  };

  languages.python = {
    enable = true;
    uv.enable = true;
  };

  # wasm-pack fetches the wasm-bindgen that matches Cargo.lock.
  packages = with pkgs; [
    bacon
    cargo-chef
    cargo-generate
    cargo-info
    cargo-lambda
    cargo-seek
    irust
    rusty-man
    trunk
    wasm-pack
    # cargo install worker-build (must match the worker crate version) needs these.
    openssl
    pkg-config
    git
    just
    # No wrangler here: use `bunx wrangler` in worker/ (or `just dev`), the version
    # worker/package.json pins and CI deploys with.
  ];
}
