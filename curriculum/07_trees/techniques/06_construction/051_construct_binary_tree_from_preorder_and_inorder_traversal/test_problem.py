from solution import construct_from_preorder_inorder
from tree_helpers import inorder_traversal, preorder_traversal


def test_construct_from_preorder_inorder_shape():
    root = construct_from_preorder_inorder([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])
    assert preorder_traversal(root) == [3, 9, 20, 15, 7]
    assert inorder_traversal(root) == [9, 3, 15, 20, 7]


def test_construct_from_preorder_inorder_empty():
    assert construct_from_preorder_inorder([], []) is None
