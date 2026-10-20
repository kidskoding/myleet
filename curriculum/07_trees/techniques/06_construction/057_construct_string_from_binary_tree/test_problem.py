from solution import tree_to_string
from tree_node import TreeNode


def test_tree_to_string_omits_empty_right():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(4)), right=TreeNode(3))
    assert tree_to_string(root) == "1(2(4))(3)"


def test_tree_to_string_keeps_placeholder_for_empty_left():
    root = TreeNode(1, left=TreeNode(2, right=TreeNode(4)), right=TreeNode(3))
    assert tree_to_string(root) == "1(2()(4))(3)"


def test_tree_to_string_empty():
    assert tree_to_string(None) == ""
