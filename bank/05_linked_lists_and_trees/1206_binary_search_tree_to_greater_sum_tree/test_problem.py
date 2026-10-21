from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import bst_to_gst


def test_bst_to_gst_example():
    root = build_tree_from_level_order(
        [4, 1, 6, 0, 2, 5, 7, None, None, None, 3, None, None, None, 8]
    )
    assert tree_to_level_order(bst_to_gst(root)) == [
        30,
        36,
        21,
        36,
        35,
        26,
        15,
        None,
        None,
        None,
        33,
        None,
        None,
        None,
        8,
    ]


def test_bst_to_gst_single():
    assert tree_to_level_order(bst_to_gst(build_tree_from_level_order([1]))) == [1]


def test_bst_to_gst_small():
    root = build_tree_from_level_order([0, None, 1])
    assert tree_to_level_order(bst_to_gst(root)) == [1, None, 1]


def test_bst_to_gst_chain():
    root = build_tree_from_level_order([1, None, 2, None, 3])
    assert tree_to_level_order(bst_to_gst(root)) == [6, None, 5, None, 3]
