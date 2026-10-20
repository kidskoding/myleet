from solution import zigzag_level_order
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_zigzag_level_order_empty_tree():
    assert zigzag_level_order(None) == []


def test_zigzag_level_order_single_node():
    assert zigzag_level_order(TreeNode(1)) == [[1]]


def test_zigzag_level_order_sample_tree():
    assert zigzag_level_order(build_sample_tree()) == [[1], [3, 2], [4, 5, 6]]


def test_zigzag_level_order_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert zigzag_level_order(root) == [[1], [2], [3]]
