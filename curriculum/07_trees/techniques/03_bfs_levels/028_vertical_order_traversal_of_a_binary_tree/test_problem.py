from binary_tree import build_tree_from_level_order
from solution import vertical_traversal


def test_vertical_traversal_normal():
    root = build_tree_from_level_order([3, 9, 20, None, None, 15, 7])
    assert vertical_traversal(root) == [[9], [3, 15], [20], [7]]


def test_vertical_traversal_sorts_ties_by_value():
    root = build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7])
    assert vertical_traversal(root) == [[4], [2], [1, 5, 6], [3], [7]]
