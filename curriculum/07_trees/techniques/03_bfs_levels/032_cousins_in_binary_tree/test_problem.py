from binary_tree import build_tree_from_level_order
from solution import is_cousins


def test_is_cousins_same_parent():
    assert is_cousins(build_tree_from_level_order([1, 2, 3, 4]), 4, 3) is False


def test_is_cousins_true():
    root = build_tree_from_level_order([1, 2, 3, None, 4, None, 5])
    assert is_cousins(root, 5, 4) is True


def test_is_cousins_siblings():
    assert is_cousins(build_tree_from_level_order([1, 2, 3, None, 4]), 2, 3) is False
