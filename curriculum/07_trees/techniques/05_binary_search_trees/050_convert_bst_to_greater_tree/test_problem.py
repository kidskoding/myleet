from binary_tree import build_tree_from_level_order
from solution import convert_bst
from tree_helpers import inorder_traversal
from tree_node import TreeNode


def test_convert_bst_accumulates_greater_values():
    root = build_tree_from_level_order([4, 1, 6, 0, 2, 5, 7, None, None, None, 3, None, None, None, 8])
    assert inorder_traversal(convert_bst(root)) == [36, 36, 35, 33, 30, 26, 21, 15, 8]


def test_convert_bst_single_node():
    assert inorder_traversal(convert_bst(TreeNode(5))) == [5]
