from binary_tree import tree_to_level_order
from solution import invert_tree
from tree_node import TreeNode


def test_invert_tree_empty_tree():
    assert invert_tree(None) is None


def test_invert_tree_single_node():
    root = TreeNode(1)

    assert invert_tree(root) is root
    assert tree_to_level_order(root) == [1]


def test_invert_tree_complete_tree():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, left=TreeNode(6), right=TreeNode(7)),
    )

    assert invert_tree(root) is root
    assert tree_to_level_order(root) == [1, 3, 2, 7, 6, 5, 4]


def test_invert_tree_sparse_tree():
    root = TreeNode(1, left=TreeNode(2, right=TreeNode(3)))

    assert invert_tree(root) is root
    assert tree_to_level_order(root) == [1, None, 2, 3]
