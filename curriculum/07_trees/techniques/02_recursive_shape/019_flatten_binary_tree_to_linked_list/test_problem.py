from binary_tree import build_tree_from_level_order
from solution import flatten
from tree_helpers import preorder_traversal


def test_flatten_produces_right_leaning_list():
    root = build_tree_from_level_order([1, 2, 5, 3, 4, None, 6])
    flatten(root)

    assert preorder_traversal(root) == [1, 2, 3, 4, 5, 6]
    assert root.left is None


def test_flatten_empty():
    assert flatten(None) is None
