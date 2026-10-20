from solution import construct_from_preorder_postorder
from tree_helpers import inorder_traversal, preorder_traversal


def test_construct_from_preorder_postorder_shape():
    root = construct_from_preorder_postorder([1, 2, 4, 5, 3, 6, 7], [4, 5, 2, 6, 7, 3, 1])
    assert inorder_traversal(root) == [4, 2, 5, 1, 6, 3, 7]


def test_construct_from_preorder_postorder_single():
    assert preorder_traversal(construct_from_preorder_postorder([1], [1])) == [1]
