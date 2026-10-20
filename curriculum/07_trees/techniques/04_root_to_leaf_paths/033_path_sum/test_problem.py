from solution import path_sum
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        5,
        left=TreeNode(4, left=TreeNode(11, left=TreeNode(7), right=TreeNode(2))),
        right=TreeNode(8, left=TreeNode(13), right=TreeNode(4, right=TreeNode(1))),
    )


def test_path_sum_empty_tree():
    assert not path_sum(None, 0)


def test_path_sum_single_node_true():
    assert path_sum(TreeNode(5), 5)


def test_path_sum_single_node_false():
    assert not path_sum(TreeNode(5), 7)


def test_path_sum_sample_tree_true():
    assert path_sum(build_sample_tree(), 22)


def test_path_sum_sample_tree_false():
    assert not path_sum(build_sample_tree(), 24)


def test_path_sum_partial_path_does_not_count():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert not path_sum(root, 3)


def test_path_sum_with_negative_values():
    root = TreeNode(-2, right=TreeNode(-3))

    assert path_sum(root, -5)
