from solution import inorder_traversal
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_inorder_traversal_sample_tree():
    assert inorder_traversal(build_sample_tree()) == [4, 2, 5, 1, 3, 6]


def test_inorder_traversal_empty():
    assert inorder_traversal(None) == []


def test_inorder_traversal_single_node():
    assert inorder_traversal(TreeNode(1)) == [1]
