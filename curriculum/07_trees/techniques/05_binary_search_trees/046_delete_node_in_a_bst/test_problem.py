from binary_tree import build_tree_from_level_order
from solution import delete_node_bst
from tree_helpers import inorder_traversal


def test_delete_node_bst_node_with_two_children():
    root = build_tree_from_level_order([5, 3, 6, 2, 4, None, 7])
    assert inorder_traversal(delete_node_bst(root, 3)) == [2, 4, 5, 6, 7]


def test_delete_node_bst_missing_key():
    root = build_tree_from_level_order([5, 3, 6, 2, 4, None, 7])
    assert inorder_traversal(delete_node_bst(root, 0)) == [2, 3, 4, 5, 6, 7]
