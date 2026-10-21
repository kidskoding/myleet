from binary_tree import build_tree_from_level_order
from solution import print_tree


def test_print_tree_example_one():
    root = build_tree_from_level_order([1, 2])
    assert print_tree(root) == [["", "1", ""], ["2", "", ""]]


def test_print_tree_example_two():
    root = build_tree_from_level_order([1, 2, 3, None, 4])
    assert print_tree(root) == [
        ["", "", "", "1", "", "", ""],
        ["", "2", "", "", "", "3", ""],
        ["", "", "4", "", "", "", ""],
    ]


def test_print_tree_single():
    assert print_tree(build_tree_from_level_order([7])) == [["7"]]


def test_print_tree_full_two_levels():
    root = build_tree_from_level_order([1, 2, 3])
    assert print_tree(root) == [["", "1", ""], ["2", "", "3"]]
