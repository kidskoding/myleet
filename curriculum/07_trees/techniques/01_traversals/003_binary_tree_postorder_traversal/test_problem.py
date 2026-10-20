from solution import postorder_traversal
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_postorder_traversal_sample_tree():
    assert postorder_traversal(build_sample_tree()) == [4, 5, 2, 6, 3, 1]


def test_postorder_traversal_empty():
    assert postorder_traversal(None) == []
