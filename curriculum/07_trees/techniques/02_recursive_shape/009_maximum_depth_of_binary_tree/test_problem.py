from solution import max_depth
from tree_node import TreeNode


def test_max_depth_empty_tree():
    assert max_depth(None) == 0


def test_max_depth_single_node():
    assert max_depth(TreeNode(1)) == 1


def test_max_depth_balanced_tree():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3),
    )

    assert max_depth(root) == 3


def test_max_depth_skewed_tree():
    root = TreeNode(1, right=TreeNode(2, right=TreeNode(3, right=TreeNode(4))))

    assert max_depth(root) == 4
