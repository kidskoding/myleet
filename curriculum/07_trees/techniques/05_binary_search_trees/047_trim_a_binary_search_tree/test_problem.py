from binary_tree import build_tree_from_level_order
from solution import trim_bst
from tree_helpers import inorder_traversal


def test_trim_bst_drops_low_value():
    assert inorder_traversal(trim_bst(build_tree_from_level_order([1, 0, 2]), 1, 2)) == [1, 2]


def test_trim_bst_keeps_nested_survivor():
    root = build_tree_from_level_order([3, 0, 4, None, 2, None, None, 1])
    assert inorder_traversal(trim_bst(root, 1, 3)) == [1, 2, 3]
