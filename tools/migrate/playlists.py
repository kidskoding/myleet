"""Convert company_problem_sets/**/*.md into playlists/*.toml.

uv run python -m tools.migrate.playlists
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ENTRY_RE = re.compile(r"^\d+\.\s+\[(.+?)\]\((\S+)\)")
MODULE_RE = re.compile(r"`(\d\d_[a-z_]+)/?`")


def parse_company(md_text: str) -> dict:
    lines = md_text.splitlines()
    playlist: dict = {"title": lines[0].lstrip("# ").strip(), "focus": "", "review_modules": [], "entries": []}
    section = None
    for line in lines[1:]:
        if line.startswith("## "):
            section = line[3:].strip()
            continue
        if line.startswith("Focus:") and not playlist["focus"]:
            playlist["focus"] = line.removeprefix("Focus:").strip()
        elif section == "Problem Set" and (match := ENTRY_RE.match(line.strip())):
            playlist["entries"].append({"title": match.group(1), "url": match.group(2)})
        elif section == "Review Modules" and (match := MODULE_RE.search(line)):
            playlist["review_modules"].append(match.group(1))
    return playlist


def render_toml(playlist: dict) -> str:
    out = [
        f"title = {json.dumps(playlist['title'])}",
        f"focus = {json.dumps(playlist['focus'])}",
        f"review_modules = {json.dumps(playlist['review_modules'])}",
    ]
    for entry in playlist["entries"]:
        out += ["", "[[entries]]", f"title = {json.dumps(entry['title'])}", f"url = {json.dumps(entry['url'])}"]
    return "\n".join(out) + "\n"


def playlist_id(filename: str, subdir: str | None) -> str:
    stem = Path(filename).stem
    return f"{subdir}-{stem}" if subdir else stem


def main() -> None:
    src = REPO / "company_problem_sets"
    out = REPO / "playlists"
    out.mkdir(exist_ok=True)
    count = 0
    for md in sorted(src.rglob("*.md")):
        if md.name == "README.md":
            continue
        subdir = md.parent.name if md.parent != src else None
        playlist = parse_company(md.read_text())
        (out / f"{playlist_id(md.name, subdir)}.toml").write_text(render_toml(playlist))
        count += 1
        print(f"{md.relative_to(REPO)}: {len(playlist['entries'])} entries")
    print(f"wrote {count} playlists")


if __name__ == "__main__":
    main()
