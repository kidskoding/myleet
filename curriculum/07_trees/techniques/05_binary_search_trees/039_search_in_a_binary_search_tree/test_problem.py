from binary_tree import build_tree_from_level_order
from solution import search_in_bst
from tree_helpers import preorder_traversal


def test_search_in_bst_found():
    root = build_tree_from_level_order([4, 2, 7, 1, 3])
    assert preorder_traversal(search_in_bst(root, 2)) == [2, 1, 3]


def test_search_in_bst_missing():
    root = build_tree_from_level_order([4, 2, 7, 1, 3])
    assert search_in_bst(root, 5) is None
