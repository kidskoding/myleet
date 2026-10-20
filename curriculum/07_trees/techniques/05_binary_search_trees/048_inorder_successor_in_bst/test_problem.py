from binary_tree import build_tree_from_level_order
from solution import inorder_successor


def test_inorder_successor_exists():
    root = build_tree_from_level_order([2, 1, 3])
    assert inorder_successor(root, root.left).val == 2


def test_inorder_successor_of_largest_is_none():
    root = build_tree_from_level_order([2, 1, 3])
    assert inorder_successor(root, root.right) is None
