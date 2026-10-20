from solution import construct_from_inorder_postorder
from tree_helpers import preorder_traversal


def test_construct_from_inorder_postorder_shape():
    root = construct_from_inorder_postorder([9, 3, 15, 20, 7], [9, 15, 7, 20, 3])
    assert preorder_traversal(root) == [3, 9, 20, 15, 7]


def test_construct_from_inorder_postorder_empty():
    assert construct_from_inorder_postorder([], []) is None
