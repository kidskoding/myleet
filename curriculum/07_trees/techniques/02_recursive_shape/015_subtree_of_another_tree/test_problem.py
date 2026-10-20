from solution import subtree_of_another_tree
from tree_node import TreeNode


def test_subtree_of_another_tree_identical_tree():
    root = TreeNode(1, left=TreeNode(2), right=TreeNode(3))

    assert subtree_of_another_tree(root, root)


def test_subtree_of_another_tree_nested_match():
    root = TreeNode(
        3,
        left=TreeNode(4, left=TreeNode(1), right=TreeNode(2)),
        right=TreeNode(5),
    )
    subroot = TreeNode(4, left=TreeNode(1), right=TreeNode(2))

    assert subtree_of_another_tree(root, subroot)


def test_subtree_of_another_tree_same_values_extra_node():
    root = TreeNode(
        3,
        left=TreeNode(4, left=TreeNode(1), right=TreeNode(2, left=TreeNode(0))),
        right=TreeNode(5),
    )
    subroot = TreeNode(4, left=TreeNode(1), right=TreeNode(2))

    assert not subtree_of_another_tree(root, subroot)


def test_subtree_of_another_tree_empty_subroot():
    assert subtree_of_another_tree(TreeNode(1), None)


def test_subtree_of_another_tree_empty_root_nonempty_subroot():
    assert not subtree_of_another_tree(None, TreeNode(1))
