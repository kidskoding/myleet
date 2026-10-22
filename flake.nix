{
  description = "myleet: adaptive LeetCode practice in your terminal";

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
      packages.default = pkgs.buildGoModule {
        pname = "myleet";
        inherit version;
        src = ./.;
        vendorHash = "sha256-Y+KVhOebtJx6Lafycl4/QjV8ZDkAv4t6okfGyRj3V9c=";
        subPackages = ["cmd/myleet"];
        ldflags = [
          "-s"
          "-w"
          "-X github.com/kidskoding/myleet/internal/version.Version=${version}"
          "-X github.com/kidskoding/myleet/internal/version.Commit=${self.shortRev or "dirty"}"
        ];
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
          go
          git
          uv
          self.packages.${system}.default
        ];
      };
    });
}
