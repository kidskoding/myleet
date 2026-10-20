"""Write the per-problem curriculum tree from the old module folders."""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from tools.migrate.index import parse_problem_set, slugify
from tools.migrate.split import split_file

LIB_MODULES = {"list_node.py", "tree_node.py", "binary_tree.py"}
HELPER_IMPORTS = {"preorder_traversal": "tree_helpers", "inorder_traversal": "tree_helpers"}
TREE_HELPERS = '''"""Trusted traversals that tests use to inspect trees built by a solution."""

from __future__ import annotations

from tree_node import TreeNode


def preorder_traversal(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    return [root.val] + preorder_traversal(root.left) + preorder_traversal(root.right)


def inorder_traversal(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right)
'''

REFERENCE_CONFTEST = """import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
"""


@dataclass
class Report:
    problems_per_technique: dict[str, int] = field(default_factory=dict)
    unmatched_notes: list[str] = field(default_factory=list)
    unknown_difficulty: list[str] = field(default_factory=list)
    collisions: list[str] = field(default_factory=list)
    no_tests: list[str] = field(default_factory=list)

    def render(self) -> str:
        lines = [f"{name}: {count}" for name, count in self.problems_per_technique.items()]
        lines.append(f"total problems: {sum(self.problems_per_technique.values())}")
        for label, items in (
            ("unmatched notes", self.unmatched_notes),
            ("unknown difficulty (defaulted to medium)", self.unknown_difficulty),
            ("id collisions", self.collisions),
            ("problems with no tests", self.no_tests),
        ):
            lines.append(f"{label}: {len(items)}")
            lines.extend(f"  {item}" for item in items)
        return "\n".join(lines)


def toml_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def module_id(dirname: str) -> str:
    return dirname.split("_", 1)[1]


def module_title(module_dir: Path) -> str:
    readme = module_dir / "README.md"
    if readme.exists():
        first = readme.read_text().splitlines()[0].lstrip("# ").strip()
        return first.split(":", 1)[1].strip() if ":" in first else first
    return module_id(module_dir.name).replace("_", " ").title()


def module_description(module_dir: Path) -> str:
    readme = module_dir / "README.md"
    if not readme.exists():
        return ""
    text = readme.read_text()
    match = re.search(r"## Topics\n\n((?:- .*\n?)+)", text)
    if not match:
        return ""
    return "; ".join(line[2:].strip() for line in match.group(1).splitlines())


def _words(text: str) -> set[str]:
    return {w.rstrip("s") for w in re.findall(r"[a-z]+", text.lower()) if len(w) > 2}


def match_note(heading: str, notes: list[Path]) -> Path | None:
    best, best_score = None, 0
    for note in notes:
        score = len(_words(heading) & _words(note.stem))
        if score > best_score:
            best, best_score = note, score
    return best


def migrate(
    repo: Path,
    out: Path,
    data: Path,
    leetcode: dict[str, tuple[int, str]],
    now: datetime,
) -> tuple[Report, dict[str, dict]]:
    report = Report()
    manifest: dict[str, dict] = {}
    used_ids: set[str] = set()
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    lib = out / "_lib"
    lib.mkdir(parents=True, exist_ok=True)
    (lib / "tree_helpers.py").write_text(TREE_HELPERS)

    for module_dir in sorted(p for p in repo.iterdir() if p.is_dir() and re.match(r"\d\d_", p.name)):
        mid = module_id(module_dir.name)
        dest = out / module_dir.name
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "module.toml").write_text(
            f"title = {toml_str(module_title(module_dir))}\n"
            f"description = {toml_str(module_description(module_dir))}\n"
        )
        if (module_dir / "README.md").exists():
            shutil.copy2(module_dir / "README.md", dest / "README.md")
        notes = sorted((module_dir / "notes").glob("*.md")) if (module_dir / "notes").exists() else []
        if notes:
            shutil.copytree(module_dir / "notes", dest / "notes", dirs_exist_ok=True)

        techniques = []
        for md in sorted((module_dir / "problem_set").glob("*_PROBLEM_SET.md")):
            techniques.extend(parse_problem_set(md.read_text()))
        problem_test_files = {f"test_{t.source_file}" for t in techniques}

        for py in sorted(module_dir.glob("*.py")):
            target = lib if py.name in LIB_MODULES else dest / "reference"
            target.mkdir(parents=True, exist_ok=True)
            shutil.copy2(py, target / py.name)
        for test in sorted((module_dir / "tests").glob("test_*.py")) if (module_dir / "tests").exists() else []:
            if test.name in problem_test_files:
                continue
            ref_tests = dest / "reference" / "tests"
            ref_tests.mkdir(parents=True, exist_ok=True)
            shutil.copy2(test, ref_tests / test.name)
            (ref_tests / "conftest.py").write_text(REFERENCE_CONFTEST)

        for technique in techniques:
            tdir = dest / "techniques" / f"{technique.number:02d}_{slugify(technique.heading).replace('-', '_')}"
            tdir.mkdir(parents=True, exist_ok=True)
            note = match_note(technique.heading, notes)
            if note is None:
                report.unmatched_notes.append(f"{module_dir.name}: {technique.heading}")
            note_rel = f"notes/{note.name}" if note else ""
            (tdir / "technique.toml").write_text(f"title = {toml_str(technique.heading)}\nnote = {toml_str(note_rel)}\n")

            source = module_dir / "problem_set" / technique.source_file
            test_file = module_dir / "tests" / f"test_{technique.source_file}"
            splits = split_file(
                source.read_text(),
                test_file.read_text() if test_file.exists() else "",
                [p.symbols for p in technique.problems],
                current_module=source.stem,
                helper_imports=HELPER_IMPORTS,
            )
            report.problems_per_technique[f"{module_dir.name}/{tdir.name}"] = len(splits)

            for problem, split in zip(technique.problems, splits):
                pid = problem.slug if problem.slug not in used_ids else f"{problem.slug}-{mid}"
                if pid != problem.slug:
                    report.collisions.append(pid)
                used_ids.add(pid)
                number, difficulty = leetcode.get(problem.slug, (0, ""))
                if not difficulty:
                    report.unknown_difficulty.append(pid)
                    difficulty = "medium"
                if not split.test_names:
                    report.no_tests.append(pid)

                pdir = tdir / f"{problem.number:03d}_{problem.slug.replace('-', '_')}"
                pdir.mkdir(parents=True, exist_ok=True)
                key_idea = split.key_idea or problem.pattern or ""
                toml = [
                    f"id = {toml_str(pid)}",
                    f"title = {toml_str(problem.title)}",
                    f"difficulty = {toml_str(difficulty)}",
                ]
                if number:
                    toml.append(f"leetcode = {number}")
                if problem.url:
                    toml.append(f"url = {toml_str(problem.url)}")
                toml += [f"key_idea = {toml_str(key_idea)}", "hints = []", 'prompt = ""']
                (pdir / "problem.toml").write_text("\n".join(toml) + "\n")
                (pdir / "starter.py").write_text(split.starter)
                (pdir / "test_problem.py").write_text(split.tests)

                if split.solved is not None:
                    snap_dir = data / "snapshots" / pid
                    snap_dir.mkdir(parents=True, exist_ok=True)
                    (snap_dir / f"{stamp}.py").write_text(split.solved)
                manifest[pid] = {
                    "old_test_file": str(test_file.relative_to(repo)),
                    "tests": split.test_names,
                }
    return report, manifest
