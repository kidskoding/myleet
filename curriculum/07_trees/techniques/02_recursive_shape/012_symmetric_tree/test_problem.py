from solution import symmetric_tree
from tree_node import TreeNode


def test_symmetric_tree_empty_tree():
    assert symmetric_tree(None)


def test_symmetric_tree_single_node():
    assert symmetric_tree(TreeNode(1))


def test_symmetric_tree_mirror_shape():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(3), right=TreeNode(4)),
        right=TreeNode(2, left=TreeNode(4), right=TreeNode(3)),
    )

    assert symmetric_tree(root)


def test_symmetric_tree_same_values_wrong_shape():
    root = TreeNode(
        1,
        left=TreeNode(2, right=TreeNode(3)),
        right=TreeNode(2, right=TreeNode(3)),
    )

    assert not symmetric_tree(root)
