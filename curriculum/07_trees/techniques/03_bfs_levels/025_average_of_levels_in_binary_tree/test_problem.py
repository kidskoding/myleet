from solution import average_of_levels
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, right=TreeNode(6)),
    )


def test_average_of_levels_empty_tree():
    assert average_of_levels(None) == []


def test_average_of_levels_sample_tree():
    assert average_of_levels(build_sample_tree()) == [1.0, 2.5, 5.0]


def test_average_of_levels_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert average_of_levels(root) == [1.0, 2.0, 3.0]
