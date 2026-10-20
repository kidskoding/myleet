"""Migrate the old module folders into curriculum/.

uv run python -m tools.migrate --out curriculum --data ~/.local/share/myleet
"""

from __future__ import annotations

import argparse
import json
import subprocess
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

from tools.migrate.write import migrate

REPO = Path(__file__).resolve().parents[2]
CACHE = REPO / "tools" / "migrate" / "leetcode_difficulty.json"
API = "https://leetcode.com/api/problems/all/"
LEVELS = {1: "easy", 2: "medium", 3: "hard"}


def load_leetcode() -> dict[str, tuple[int, str]]:
    if not CACHE.exists():
        try:
            request = urllib.request.Request(API, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
        except OSError as err:
            print(f"warning: could not fetch LeetCode metadata ({err}); every difficulty defaults to medium")
            return {}
        table = {
            pair["stat"]["question__title_slug"]: [int(pair["stat"]["frontend_question_id"]), LEVELS[pair["difficulty"]["level"]]]
            for pair in payload["stat_status_pairs"]
        }
        CACHE.write_text(json.dumps(table, indent=0, sort_keys=True) + "\n")
    return {slug: (number, level) for slug, (number, level) in json.loads(CACHE.read_text()).items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=REPO / "curriculum")
    parser.add_argument("--data", type=Path, required=True)
    args = parser.parse_args()

    report, manifest = migrate(REPO, args.out, args.data.expanduser(), load_leetcode(), datetime.now(UTC))
    (REPO / "tools" / "migrate" / "manifest.json").write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
    subprocess.run(["uv", "run", "ruff", "check", "--fix", "--select", "F401,I", "-q", str(args.out)], cwd=REPO)
    subprocess.run(["uv", "run", "ruff", "format", "-q", str(args.out)], cwd=REPO)
    print(report.render())


if __name__ == "__main__":
    main()
