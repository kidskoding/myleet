from binary_tree import build_tree_from_level_order
from solution import width_of_binary_tree


def test_width_of_binary_tree_with_gaps():
    root = build_tree_from_level_order([1, 3, 2, 5, 3, None, 9])
    assert width_of_binary_tree(root) == 4


def test_width_of_binary_tree_left_heavy():
    assert width_of_binary_tree(build_tree_from_level_order([1, 3, 2, 5])) == 2


def test_width_of_binary_tree_single_node():
    assert width_of_binary_tree(build_tree_from_level_order([1])) == 1
