from binary_tree import build_tree_from_level_order
from solution import recover_tree
from tree_helpers import inorder_traversal


def test_recover_tree_swapped_neighbours():
    root = build_tree_from_level_order([1, 3, None, None, 2])
    recover_tree(root)
    assert inorder_traversal(root) == [1, 2, 3]


def test_recover_tree_swapped_non_neighbours():
    root = build_tree_from_level_order([3, 1, 4, None, None, 2])
    recover_tree(root)
    assert inorder_traversal(root) == [1, 2, 3, 4]
