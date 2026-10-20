from solution import construct_maximum_binary_tree
from tree_helpers import preorder_traversal


def test_construct_maximum_binary_tree_normal():
    assert preorder_traversal(construct_maximum_binary_tree([3, 2, 1, 6, 0, 5])) == [
        6,
        3,
        2,
        1,
        5,
        0,
    ]


def test_construct_maximum_binary_tree_single():
    assert preorder_traversal(construct_maximum_binary_tree([1])) == [1]
