#!/sh
# Install the latest myleet release into ~/.local/bin.
# Usage: curl -fsSL https://raw.githubusercontent.com/kidskoding/myleet/master/scripts/install.sh | sh
set -eu

REPO="kidskoding/myleet"
BIN_DIR="${MYLEET_BIN_DIR:-$HOME/.local/bin}"
TMP="${TMPDIR:-/tmp}/myleet-install.$$"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

need() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "myleet install: need '$1' on PATH" >&2
		exit 1
	fi
}

need curl
need tar
need mktemp

uname_s=$(uname -s)
uname_m=$(uname -m)
case "$uname_s" in
Darwin) os=darwin ;;
Linux) os=linux ;;
MINGW* | MSYS* | CYGWIN*) os=windows ;;
*)
	echo "myleet install: unsupported OS: $uname_s" >&2
	exit 1
	;;
esac
case "$uname_m" in
x86_64 | amd64) arch=amd64 ;;
aarch64 | arm64) arch=arm64 ;;
*)
	echo "myleet install: unsupported arch: $uname_m" >&2
	exit 1
	;;
esac
if [ "$os" = windows ] && [ "$arch" = arm64 ]; then
	echo "myleet install: windows/arm64 builds are not published" >&2
	exit 1
fi

if [ "$os" = windows ]; then
	ext=zip
	need unzip
else
	ext=tar.gz
fi

api="https://api.github.com/repos/${REPO}/releases/latest"
json=$(curl -fsSL "$api")
tag=$(printf '%s' "$json" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)
version=${tag#v}
if [ -z "$tag" ] || [ -z "$version" ]; then
	echo "myleet install: could not resolve latest release" >&2
	exit 1
fi

asset="myleet_${version}_${os}_${arch}.${ext}"
base="https://github.com/${REPO}/releases/download/${tag}"
mkdir -p "$TMP"
echo "myleet install: downloading ${asset} (${tag})"
curl -fsSL -o "$TMP/$asset" "${base}/${asset}"
curl -fsSL -o "$TMP/checksums.txt" "${base}/checksums.txt"

# Verify checksum when sha256sum/shasum is available.
sum_line=$(grep -F " $asset" "$TMP/checksums.txt" || grep -F " *$asset" "$TMP/checksums.txt" || true)
if [ -n "$sum_line" ]; then
	want=$(printf '%s' "$sum_line" | awk '{print $1}')
	if command -v sha256sum >/dev/null 2>&1; then
		got=$(sha256sum "$TMP/$asset" | awk '{print $1}')
	elif command -v shasum >/dev/null 2>&1; then
		got=$(shasum -a 256 "$TMP/$asset" | awk '{print $1}')
	else
		got=""
	fi
	if [ -n "$got" ] && [ "$got" != "$want" ]; then
		echo "myleet install: checksum mismatch for $asset" >&2
		exit 1
	fi
fi

extract="$TMP/out"
mkdir -p "$extract"
if [ "$ext" = zip ]; then
	unzip -q "$TMP/$asset" -d "$extract"
else
	tar -xzf "$TMP/$asset" -C "$extract"
fi

bin=$(find "$extract" -type f \( -name myleet -o -name myleet.exe \) | head -1)
if [ -z "$bin" ]; then
	echo "myleet install: binary not found in archive" >&2
	exit 1
fi

mkdir -p "$BIN_DIR"
install -m 755 "$bin" "$BIN_DIR/myleet"
echo "myleet install: installed $BIN_DIR/myleet (${tag})"

case ":$PATH:" in
*":$BIN_DIR:"*) ;;
*)
	echo "myleet install: add $BIN_DIR to PATH, then open a new shell" >&2
	echo "  export PATH=\"$BIN_DIR:\$PATH\"" >&2
	;;
esac

missing=""
command -v git >/dev/null 2>&1 || missing="$missing git"
command -v uv >/dev/null 2>&1 || missing="$missing uv"
if [ -n "$missing" ]; then
	echo "myleet install: optional tools missing:$missing (needed for curriculum clone / problem tests)" >&2
	echo "  uv: https://docs.astral.sh/uv/" >&2
fi

echo "myleet install: run \`myleet\` to start (first launch sets up the curriculum)"
