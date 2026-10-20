"""Prove the migration kept every test outcome.

python -m tools.migrate.integrity before   # on the old tree, records outcomes
python -m tools.migrate.integrity after    # on the new tree, compares
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import tomllib
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
STATE = REPO / "build" / "migrate"
ALLOWED = {"passed": {"passed"}, "failed": {"failed"}, "skipped": {"passed", "not_started"}}


def _outcome(case: ET.Element) -> str:
    for tag in ("failure", "error"):
        node = case.find(tag)
        if node is not None:
            text = (node.get("message") or "") + (node.text or "")
            return "not_started" if "NotImplementedError" in text else "failed"
    return "skipped" if case.find("skipped") is not None else "passed"


def parse_junit(path: Path) -> list[tuple[str, str, str]]:
    """(classname, test name, outcome) for each test case."""
    root = ET.parse(path).getroot()
    return [(c.get("classname", ""), c.get("name", ""), _outcome(c)) for c in root.iter("testcase")]


def compare(
    before: dict[tuple[str, str], str],
    after: dict[str, dict[str, str]],
    manifest: dict[str, dict],
) -> list[str]:
    problems: list[str] = []
    placed: set[tuple[str, str]] = set()
    for pid, entry in manifest.items():
        for name in entry["tests"]:
            key = (entry["old_test_file"], name)
            placed.add(key)
            old = before.get(key)
            new = after.get(pid, {}).get(name, "missing")
            if old is None:
                problems.append(f"{pid}::{name}: not in before run")
            elif new not in ALLOWED[old]:
                problems.append(f"{pid}::{name}: before {old}, after {new}")
    manifest_files = {e["old_test_file"] for e in manifest.values()}
    for key in sorted(before):
        if key[0] in manifest_files and key not in placed:
            problems.append(f"missing from manifest: {key[0]}::{key[1]}")
    return problems


def run_before() -> None:
    STATE.mkdir(parents=True, exist_ok=True)
    xml = STATE / "before.xml"
    subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", f"--junitxml={xml}"], cwd=REPO)
    outcomes = {}
    for classname, name, outcome in parse_junit(xml):
        file = classname.replace(".", "/") + ".py"
        outcomes[f"{file}::{name}"] = "skipped" if outcome == "not_started" else outcome
    (STATE / "before.json").write_text(json.dumps(outcomes, indent=1, sort_keys=True))
    print(f"before: recorded {len(outcomes)} test outcomes")


def _problem_dirs(curriculum: Path) -> dict[str, Path]:
    dirs = {}
    for toml in curriculum.glob("*/techniques/*/*/problem.toml"):
        dirs[tomllib.loads(toml.read_text())["id"]] = toml.parent
    return dirs


def _run_problem(pdir: Path, code: Path, lib: Path) -> dict[str, str]:
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copy2(code, Path(tmp) / "solution.py")
        shutil.copy2(pdir / "test_problem.py", Path(tmp) / "test_problem.py")
        env = {**os.environ, "PYTHONPATH": str(lib)}
        xml = Path(tmp) / "r.xml"
        subprocess.run(
            [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", f"--junitxml={xml}", "test_problem.py"],
            cwd=tmp,
            env=env,
            capture_output=True,
            timeout=120,
        )
        return {name: outcome for _, name, outcome in parse_junit(xml)} if xml.exists() else {}


def run_after(data: Path) -> int:
    curriculum = REPO / "curriculum"
    manifest = json.loads((REPO / "tools" / "migrate" / "manifest.json").read_text())
    before = {tuple(k.split("::", 1)): v for k, v in json.loads((STATE / "before.json").read_text()).items()}
    dirs = _problem_dirs(curriculum)
    lib = curriculum / "_lib"

    def job(pid: str) -> tuple[str, dict[str, str], bool]:
        snaps = sorted((data / "snapshots" / pid).glob("*.py"))
        code = snaps[-1] if snaps else dirs[pid] / "starter.py"
        return pid, _run_problem(dirs[pid], code, lib), bool(snaps)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(job, sorted(manifest)))
    after = {pid: outcomes for pid, outcomes, _ in results}
    solved = sum(1 for *_, has in results if has)
    problems = compare(before, after, manifest)
    for line in problems:
        print(line)
    if problems:
        print(f"integrity: FAILED ({len(problems)} problems)")
        return 1
    print(f"integrity: OK ({solved} solved, {len(results) - solved} stubs)")
    return 0


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("before", "after"):
        print(__doc__)
        return 2
    if sys.argv[1] == "before":
        run_before()
        return 0
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
    data = Path(sys.argv[2]) if len(sys.argv) > 2 else data_home / "myleet"
    return run_after(data)


if __name__ == "__main__":
    sys.exit(main())
