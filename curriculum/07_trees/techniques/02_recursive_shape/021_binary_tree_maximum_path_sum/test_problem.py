from binary_tree import build_tree_from_level_order
from solution import max_path_sum
from tree_node import TreeNode


def test_max_path_sum_all_positive():
    assert max_path_sum(build_tree_from_level_order([1, 2, 3])) == 6


def test_max_path_sum_skips_negative_root():
    root = build_tree_from_level_order([-10, 9, 20, None, None, 15, 7])
    assert max_path_sum(root) == 42


def test_max_path_sum_single_negative_node():
    assert max_path_sum(TreeNode(-3)) == -3
