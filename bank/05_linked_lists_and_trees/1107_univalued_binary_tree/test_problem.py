from binary_tree import build_tree_from_level_order
from solution import is_unival_tree


def test_is_unival_tree_all_same():
    assert is_unival_tree(build_tree_from_level_order([1, 1, 1, 1, 1, None, 1])) is True


def test_is_unival_tree_one_different():
    assert is_unival_tree(build_tree_from_level_order([2, 2, 2, 5, 2])) is False


def test_is_unival_tree_single_node():
    assert is_unival_tree(build_tree_from_level_order([0])) is True


def test_is_unival_tree_deep_mismatch():
    assert is_unival_tree(build_tree_from_level_order([1, 1, 1, None, None, None, 2])) is False


def test_is_unival_tree_root_differs():
    assert is_unival_tree(build_tree_from_level_order([3, 4, 4])) is False
