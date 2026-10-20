from binary_tree import build_tree_from_level_order
from solution import find_bottom_left_value


def test_find_bottom_left_value_simple():
    assert find_bottom_left_value(build_tree_from_level_order([2, 1, 3])) == 1


def test_find_bottom_left_value_deeper():
    root = build_tree_from_level_order([1, 2, 3, 4, None, 5, 6, None, None, 7])
    assert find_bottom_left_value(root) == 7
