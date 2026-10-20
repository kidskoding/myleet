from solution import right_side_view
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_right_side_view_empty_tree():
    assert right_side_view(None) == []


def test_right_side_view_sample_tree():
    assert right_side_view(build_sample_tree()) == [1, 3, 6]


def test_right_side_view_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert right_side_view(root) == [1, 2, 3]
