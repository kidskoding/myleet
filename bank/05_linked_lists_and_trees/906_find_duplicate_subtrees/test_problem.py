from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import find_duplicate_subtrees


def shapes(values: list[int | None]) -> list[list[int | None]]:
    roots = find_duplicate_subtrees(build_tree_from_level_order(values))
    return sorted((tree_to_level_order(r) for r in roots), key=str)


def test_find_duplicate_subtrees_example_one():
    assert shapes([1, 2, 3, 4, None, 2, 4, None, None, 4]) == [[2, 4], [4]]


def test_find_duplicate_subtrees_two_equal_leaves():
    assert shapes([2, 1, 1]) == [[1]]


def test_find_duplicate_subtrees_nested_duplicates():
    assert shapes([2, 2, 2, 3, None, 3, None]) == [[2, 3], [3]]


def test_find_duplicate_subtrees_single_node():
    assert shapes([1]) == []


def test_find_duplicate_subtrees_mirror_is_not_duplicate():
    assert shapes([1, 2, 2, None, 3, 3]) == [[3]]


def test_find_duplicate_subtrees_each_kind_reported_once():
    assert shapes([0, 0, 0, 0, 0, 0, 0]) == [[0, 0, 0], [0]]
