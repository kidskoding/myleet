{pkgs, ...}: {
  languages.rust = {
    enable = true;
    channel = "nightly";
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

    # cargo install worker-build (must match the worker crate version) needs these
    openssl
    pkg-config
    git
    just
    
    # execute wrangler with bun: `bunx wrangler dev` (nix version is not up to date)
    # wrangler
  ];
}
