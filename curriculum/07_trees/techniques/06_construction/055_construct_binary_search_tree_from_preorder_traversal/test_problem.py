from solution import bst_from_preorder
from tree_helpers import inorder_traversal, preorder_traversal


def test_bst_from_preorder_keeps_preorder():
    assert preorder_traversal(bst_from_preorder([8, 5, 1, 7, 10, 12])) == [8, 5, 1, 7, 10, 12]


def test_bst_from_preorder_is_sorted_in_order():
    assert inorder_traversal(bst_from_preorder([8, 5, 1, 7, 10, 12])) == [1, 5, 7, 8, 10, 12]
