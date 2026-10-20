from solution import preorder_traversal
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_preorder_traversal_sample_tree():
    assert preorder_traversal(build_sample_tree()) == [1, 2, 4, 5, 3, 6]


def test_preorder_traversal_empty():
    assert preorder_traversal(None) == []
