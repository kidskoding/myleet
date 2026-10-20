from solution import binary_tree_paths
from tree_node import TreeNode


def build_small_path_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, left=TreeNode(6), right=TreeNode(7)),
    )


def test_binary_tree_paths_empty_tree():
    assert binary_tree_paths(None) == []


def test_binary_tree_paths_single_node():
    assert binary_tree_paths(TreeNode(1)) == ["1"]


def test_binary_tree_paths_sample_tree():
    root = TreeNode(1, left=TreeNode(2, right=TreeNode(5)), right=TreeNode(3))

    assert binary_tree_paths(root) == ["1->2->5", "1->3"]


def test_binary_tree_paths_left_skewed_tree():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert binary_tree_paths(root) == ["1->2->3"]


def test_binary_tree_paths_multiple_leaves():
    assert binary_tree_paths(build_small_path_tree()) == [
        "1->2->4",
        "1->2->5",
        "1->3->6",
        "1->3->7",
    ]
