from solution import diameter_of_binary_tree
from tree_node import TreeNode


def test_diameter_of_binary_tree_empty_tree():
    assert diameter_of_binary_tree(None) == 0


def test_diameter_of_binary_tree_single_node():
    assert diameter_of_binary_tree(TreeNode(1)) == 0


def test_diameter_of_binary_tree_through_root():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3),
    )

    assert diameter_of_binary_tree(root) == 3


def test_diameter_of_binary_tree_not_through_root():
    root = TreeNode(
        1,
        left=TreeNode(
            2,
            left=TreeNode(4, left=TreeNode(6)),
            right=TreeNode(5, right=TreeNode(7)),
        ),
    )

    assert diameter_of_binary_tree(root) == 4
