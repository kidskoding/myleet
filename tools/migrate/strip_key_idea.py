"""Remove `# Key idea:` comments (and their continuation lines) from starter code.

The key idea names the technique, so it lives only in problem.toml where the
trainer reveals it as the last hint.

    uv run python -m tools.migrate.strip_key_idea curriculum
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

KEY_RE = re.compile(r"^\s*# Key idea:")
SECTION_RE = re.compile(r"^\s*# (Time|Space|Problem \d+):")


def strip_key_idea(src: str) -> str:
    out: list[str] = []
    skipping = False
    for line in src.split("\n"):
        if KEY_RE.match(line):
            skipping = True
            continue
        if skipping and line.strip().startswith("#") and not SECTION_RE.match(line):
            continue
        skipping = False
        out.append(line)
    return "\n".join(out)


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "curriculum")
    changed = 0
    for path in sorted(root.glob("*/techniques/*/*/starter.py")):
        before = path.read_text()
        after = strip_key_idea(before)
        if after != before:
            path.write_text(after)
            changed += 1
    print(f"stripped the key idea from {changed} starters")


if __name__ == "__main__":
    main()
