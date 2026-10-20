from solution import sum_root_to_leaf_numbers
from tree_node import TreeNode


def test_sum_root_to_leaf_numbers_empty_tree():
    assert sum_root_to_leaf_numbers(None) == 0


def test_sum_root_to_leaf_numbers_single_node():
    assert sum_root_to_leaf_numbers(TreeNode(7)) == 7


def test_sum_root_to_leaf_numbers_two_paths():
    root = TreeNode(1, left=TreeNode(2), right=TreeNode(3))

    assert sum_root_to_leaf_numbers(root) == 25


def test_sum_root_to_leaf_numbers_multi_digit_paths():
    root = TreeNode(
        4,
        left=TreeNode(9, left=TreeNode(5), right=TreeNode(1)),
        right=TreeNode(0),
    )

    assert sum_root_to_leaf_numbers(root) == 1026


def test_sum_root_to_leaf_numbers_skewed_tree():
    root = TreeNode(1, right=TreeNode(0, right=TreeNode(5)))

    assert sum_root_to_leaf_numbers(root) == 105
