from solution import same_tree
from tree_node import TreeNode


def test_same_tree_both_empty():
    assert same_tree(None, None)


def test_same_tree_one_empty():
    assert not same_tree(TreeNode(1), None)
    assert not same_tree(None, TreeNode(1))


def test_same_tree_identical_trees():
    p = TreeNode(1, left=TreeNode(2), right=TreeNode(3))
    q = TreeNode(1, left=TreeNode(2), right=TreeNode(3))

    assert same_tree(p, q)


def test_same_tree_different_values():
    p = TreeNode(1, left=TreeNode(2), right=TreeNode(3))
    q = TreeNode(1, left=TreeNode(2), right=TreeNode(4))

    assert not same_tree(p, q)


def test_same_tree_different_shapes():
    p = TreeNode(1, left=TreeNode(2))
    q = TreeNode(1, right=TreeNode(2))

    assert not same_tree(p, q)
