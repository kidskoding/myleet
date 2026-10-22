# AUR: myleet-bin

Binary package sourced from GitHub Releases.

## Publish (maintainer)

1. Create the AUR package once: https://aur.archlinux.org/packages/submit
2. Clone and push:

```bash
git clone ssh://aur@aur.archlinux.org/myleet-bin.git
cp packaging/aur/myleet-bin/PKGBUILD packaging/aur/myleet-bin/.SRCINFO myleet-bin/
cd myleet-bin
# fill sha256sums from the release checksums.txt, then:
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO
git commit -m "myleet-bin 0.1.0-1"
git push
```

Users install with:

```bash
yay -S myleet-bin
# or
paru -S myleet-bin
```
