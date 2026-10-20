from binary_tree import build_tree_from_level_order
from solution import insert_into_bst
from tree_helpers import inorder_traversal


def test_insert_into_bst_normal():
    root = build_tree_from_level_order([4, 2, 7, 1, 3])
    assert inorder_traversal(insert_into_bst(root, 5)) == [1, 2, 3, 4, 5, 7]


def test_insert_into_bst_empty():
    assert inorder_traversal(insert_into_bst(None, 5)) == [5]
