from solution import balanced_binary_tree
from tree_node import TreeNode


def test_balanced_binary_tree_empty_tree():
    assert balanced_binary_tree(None)


def test_balanced_binary_tree_balanced_tree():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3),
    )

    assert balanced_binary_tree(root)


def test_balanced_binary_tree_unbalanced_tree():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(3, left=TreeNode(4))),
        right=TreeNode(5),
    )

    assert not balanced_binary_tree(root)
