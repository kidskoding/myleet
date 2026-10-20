from binary_tree import build_tree_from_level_order
from solution import validate_bst


def test_validate_bst_valid():
    assert validate_bst(build_tree_from_level_order([2, 1, 3])) is True


def test_validate_bst_invalid_grandchild():
    assert validate_bst(build_tree_from_level_order([5, 1, 4, None, None, 3, 6])) is False


def test_validate_bst_left_child_too_large():
    assert validate_bst(build_tree_from_level_order([5, 4, 6, None, None, 3, 7])) is False


def test_validate_bst_empty():
    assert validate_bst(None) is True
