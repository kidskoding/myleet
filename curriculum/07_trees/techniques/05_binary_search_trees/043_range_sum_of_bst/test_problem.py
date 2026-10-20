from binary_tree import build_tree_from_level_order
from solution import range_sum_bst


def test_range_sum_bst_normal():
    root = build_tree_from_level_order([10, 5, 15, 3, 7, None, 18])
    assert range_sum_bst(root, 7, 15) == 32


def test_range_sum_bst_deeper_tree():
    root = build_tree_from_level_order([10, 5, 15, 3, 7, 13, 18, 1, None, 6])
    assert range_sum_bst(root, 6, 10) == 23
