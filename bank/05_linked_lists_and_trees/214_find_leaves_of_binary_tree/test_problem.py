from binary_tree import build_tree_from_level_order
from solution import find_leaves


def test_find_leaves_example():
    assert find_leaves(build_tree_from_level_order([1, 2, 3, 4, 5])) == [[4, 5, 3], [2], [1]]


def test_find_leaves_single():
    assert find_leaves(build_tree_from_level_order([1])) == [[1]]


def test_find_leaves_empty():
    assert find_leaves(None) == []


def test_find_leaves_chain():
    assert find_leaves(build_tree_from_level_order([1, 2, None, 3])) == [[3], [2], [1]]


def test_find_leaves_uneven_depths():
    root = build_tree_from_level_order([1, 2, 3, None, 4, 5, 6, None, None, 7])
    assert find_leaves(root) == [[4, 7, 6], [2, 5], [3], [1]]
