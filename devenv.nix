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

  # wasm-pack fetches the wasm-bindgen that matches Cargo.lock; worker-build comes from cargo.
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
    git
    just
  ];
}
