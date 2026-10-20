import shutil
import tomllib
from datetime import UTC, datetime
from pathlib import Path

from tools.migrate.write import migrate

FIXTURE = Path(__file__).parent / "fixtures" / "01_demo"
NOW = datetime(2026, 10, 19, 15, 4, 5, tzinfo=UTC)


def _repo(tmp_path: Path, second_module: bool = False) -> Path:
    repo = tmp_path / "repo"
    shutil.copytree(FIXTURE, repo / "01_demo")
    (repo / "01_demo" / "notes").mkdir()
    (repo / "01_demo" / "notes" / "01_demo_basics.md").write_text("# Demo Basics\n")
    (repo / "01_demo" / "README.md").write_text("# Module 01: Demo\n\n## Topics\n\n- Demo things\n")
    (repo / "01_demo" / "helper_structure.py").write_text("def helper() -> int:\n    return 1\n")
    (repo / "01_demo" / "tests" / "test_helper_structure.py").write_text(
        "import helper_structure\n\n\ndef test_helper():\n    assert helper_structure.helper() == 1\n"
    )
    if second_module:
        shutil.copytree(FIXTURE, repo / "02_again")
        md = repo / "02_again" / "problem_set" / "DEMO_PROBLEM_SET.md"
        md.write_text(md.read_text().replace("## Demo", "## Again"))
    return repo


def test_write_tree_from_fixture(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    out, data = tmp_path / "curriculum", tmp_path / "data"
    report, manifest = migrate(repo, out, data, {"two-sum": (1, "easy")}, NOW)

    folder = out / "01_demo" / "techniques" / "01_demo" / "001_two_sum"
    for name in ("problem.toml", "starter.py", "test_problem.py"):
        assert (folder / name).is_file(), name
    meta = tomllib.loads((folder / "problem.toml").read_text())
    assert meta["id"] == "two-sum"
    assert meta["title"] == "Two Sum"
    assert meta["difficulty"] == "easy"
    assert meta["leetcode"] == 1
    assert meta["url"] == "https://leetcode.com/problems/two-sum/"
    assert meta["key_idea"] == "complement lookup in a hash map."
    assert meta["hints"] == [] and meta["prompt"] == ""

    module = tomllib.loads((out / "01_demo" / "module.toml").read_text())
    assert module["title"] == "Demo"
    technique = tomllib.loads((out / "01_demo" / "techniques" / "01_demo" / "technique.toml").read_text())
    assert technique == {"title": "Demo", "note": "notes/01_demo_basics.md"}

    assert (out / "01_demo" / "notes" / "01_demo_basics.md").is_file()
    assert (out / "01_demo" / "README.md").is_file()
    assert (out / "01_demo" / "reference" / "helper_structure.py").is_file()
    assert (out / "01_demo" / "reference" / "tests" / "test_helper_structure.py").is_file()
    assert (out / "01_demo" / "reference" / "tests" / "conftest.py").is_file()
    assert manifest["two-sum"] == {
        "old_test_file": "01_demo/tests/test_demo_problems.py",
        "tests": ["test_two_sum_basic", "test_two_sum_pair_at_end"],
    }
    assert "3sum" in report.unknown_difficulty


def test_snapshot_only_for_solved(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    data = tmp_path / "data"
    migrate(repo, tmp_path / "curriculum", data, {}, NOW)
    snap = data / "snapshots" / "two-sum" / "20261019T150405Z.py"
    assert snap.is_file()
    assert "seen[x] = i" in snap.read_text()
    assert not (data / "snapshots" / "3sum").exists()
    assert not (data / "workspace").exists()


def test_id_collision_suffix(tmp_path: Path) -> None:
    repo = _repo(tmp_path, second_module=True)
    out = tmp_path / "curriculum"
    report, manifest = migrate(repo, out, tmp_path / "data", {}, NOW)
    assert "two-sum" in manifest and "two-sum-again" in manifest
    again = tomllib.loads((out / "02_again" / "techniques" / "01_again" / "001_two_sum" / "problem.toml").read_text())
    assert again["id"] == "two-sum-again"
    assert "two-sum-again" in report.collisions
