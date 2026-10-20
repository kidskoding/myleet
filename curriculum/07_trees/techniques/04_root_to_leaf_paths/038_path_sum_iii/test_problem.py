from binary_tree import build_tree_from_level_order
from solution import path_sum_iii


def test_path_sum_iii_normal():
    root = build_tree_from_level_order([10, 5, -3, 3, 2, None, 11, 3, -2, None, 1])
    assert path_sum_iii(root, 8) == 3


def test_path_sum_iii_deeper_tree():
    root = build_tree_from_level_order([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, 5, 1])
    assert path_sum_iii(root, 22) == 3
