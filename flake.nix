{
  description = "an interactive and personalized leetcode experience";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      version =
        if self ? rev
        then self.shortRev or self.rev
        else "dev";
    in {
      packages.default = pkgs.rustPlatform.buildRustPackage {
        pname = "myleet";
        inherit version;
        src = ./.;
        cargoLock.lockFile = ./Cargo.lock;
        env = {
          MYLEET_VERSION = version;
          MYLEET_COMMIT = self.shortRev or "dirty";
        };
        # Tests need pytest and a writable temp root; CI runs them instead.
        doCheck = false;
        nativeBuildInputs = [pkgs.makeWrapper];
        postInstall = ''
          wrapProgram $out/bin/myleet \
            --prefix PATH : ${pkgs.lib.makeBinPath [pkgs.git pkgs.uv]}
        '';
        meta = with pkgs.lib; {
          description = "Adaptive LeetCode practice in your terminal";
          homepage = "https://github.com/kidskoding/myleet";
          license = licenses.mit;
          mainProgram = "myleet";
        };
      };

      packages.myleet = self.packages.${system}.default;

      apps.default = {
        type = "app";
        program = "${self.packages.${system}.default}/bin/myleet";
      };

      # Runtime helpers for a full practice session (clone + pytest via uv).
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          cargo
          rustc
          rustfmt
          clippy
          just
          git
          uv
          self.packages.${system}.default
        ];
      };
    });
}
