import ast
from pathlib import Path

from tools.migrate.split import is_stub, split_file, stub_source

FIXTURE = Path(__file__).parent / "fixtures" / "01_demo"
PROBLEMS = [["two_sum"], ["three_sum"], ["Codec"]]


def _split():
    problem_src = (FIXTURE / "problem_set" / "demo_problems.py").read_text()
    test_src = (FIXTURE / "tests" / "test_demo_problems.py").read_text()
    return split_file(problem_src, test_src, PROBLEMS, current_module="demo_problems", helper_imports={})


def test_starter_keeps_support_and_comments() -> None:
    two_sum, three_sum, _ = _split()
    assert "class Reader" not in two_sum.starter
    assert "class Reader" in three_sum.starter
    assert "# Problem 1: Two Sum" in two_sum.starter
    assert "Key idea" not in two_sum.starter
    assert "    # Time:\n" in two_sum.starter
    assert "O(n) one pass" not in two_sum.starter
    assert two_sum.starter.rstrip().endswith("raise NotImplementedError")
    assert "from list_node import ListNode" in two_sum.starter
    assert two_sum.key_idea == "complement lookup in a hash map."


def test_solved_detection() -> None:
    two_sum, three_sum, codec = _split()
    assert two_sum.solved is not None
    assert "seen[x] = i" in two_sum.solved
    assert three_sum.solved is None
    assert codec.solved is not None
    assert "def decode" in codec.starter
    assert codec.starter.count("raise NotImplementedError") == 2


def test_tests_routed_by_name() -> None:
    two_sum, three_sum, codec = _split()
    assert two_sum.test_names == ["test_two_sum_basic", "test_two_sum_pair_at_end"]
    assert three_sum.test_names == ["test_three_sum_board"]
    assert codec.test_names == ["test_codec_roundtrip"]
    assert "def _board" in three_sum.tests
    assert "class _ListReader" in three_sum.tests
    assert "def _board" not in two_sum.tests
    assert "test_two_sum" not in three_sum.tests
    assert "from solution import Reader, three_sum" in three_sum.tests
    assert "from solution import two_sum" in two_sum.tests
    assert "problem_set" not in two_sum.tests


def test_cross_file_helpers_rewritten() -> None:
    test_src = (
        "from problem_set.demo_problems import two_sum\n"
        "from problem_set.other_problems import walk\n\n\n"
        "def test_two_sum_walk():\n"
        "    assert walk(two_sum([1], 1)) == []\n"
    )
    problem_src = (FIXTURE / "problem_set" / "demo_problems.py").read_text()
    split = split_file(problem_src, test_src, PROBLEMS, current_module="demo_problems", helper_imports={"walk": "tree_helpers"})
    assert "from tree_helpers import walk" in split[0].tests


def test_output_compiles() -> None:
    for problem in _split():
        ast.parse(problem.starter)
        ast.parse(problem.tests)
        if problem.solved is not None:
            ast.parse(problem.solved)


def test_stub_source_matches_restub_behavior() -> None:
    src = "def f(x: int) -> int:\n    # Problem 1: F\n    # Time: O(1) fast\n    return x\n"
    assert stub_source(src) == "def f(x: int) -> int:\n    # Problem 1: F\n    # Time:\n\n    raise NotImplementedError\n"
    tree = ast.parse(stub_source(src))
    assert is_stub(tree.body[0])


def test_helper_never_shadows_own_symbol() -> None:
    problem_src = "def walk(x: int) -> list[int]:\n    raise NotImplementedError\n"
    test_src = "from problem_set.walk_problems import walk\n\n\ndef test_walk():\n    assert walk(1) == []\n"
    split = split_file(problem_src, test_src, [["walk"]], current_module="walk_problems", helper_imports={"walk": "tree_helpers"})
    assert "tree_helpers" not in split[0].tests
    assert "from solution import walk" in split[0].tests
