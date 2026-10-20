from solution import convert_sorted_array_to_bst
from tree_helpers import inorder_traversal


def test_convert_sorted_array_to_bst_is_a_bst():
    assert inorder_traversal(convert_sorted_array_to_bst([-10, -3, 0, 5, 9])) == [
        -10,
        -3,
        0,
        5,
        9,
    ]


def test_convert_sorted_array_to_bst_empty():
    assert convert_sorted_array_to_bst([]) is None
