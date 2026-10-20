from solution import level_order
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_level_order_empty_tree():
    assert level_order(None) == []


def test_level_order_single_node():
    assert level_order(TreeNode(1)) == [[1]]


def test_level_order_sample_tree():
    assert level_order(build_sample_tree()) == [[1], [2, 3], [4, 5, 6]]


def test_level_order_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert level_order(root) == [[1], [2], [3]]
