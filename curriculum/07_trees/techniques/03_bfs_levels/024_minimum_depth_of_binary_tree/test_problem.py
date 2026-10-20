from solution import minimum_depth
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_minimum_depth_empty_tree():
    assert minimum_depth(None) == 0


def test_minimum_depth_single_node():
    assert minimum_depth(TreeNode(1)) == 1


def test_minimum_depth_sample_tree():
    assert minimum_depth(build_sample_tree()) == 3


def test_minimum_depth_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert minimum_depth(root) == 3
