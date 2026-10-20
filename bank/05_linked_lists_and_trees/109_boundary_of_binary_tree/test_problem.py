from binary_tree import build_tree_from_level_order
from solution import boundary_of_binary_tree


def test_boundary_of_binary_tree_single_node():
    assert boundary_of_binary_tree(build_tree_from_level_order([1])) == [1]


def test_boundary_of_binary_tree_no_left_subtree():
    assert boundary_of_binary_tree(build_tree_from_level_order([1, None, 2, 3, 4])) == [1, 3, 4, 2]


def test_boundary_of_binary_tree_full_example():
    tree = build_tree_from_level_order([1, 2, 3, 4, 5, 6, None, None, None, 7, 8, 9, 10])
    assert boundary_of_binary_tree(tree) == [1, 2, 4, 7, 8, 9, 10, 6, 3]


def test_boundary_of_binary_tree_small_full_tree():
    assert boundary_of_binary_tree(build_tree_from_level_order([1, 2, 3])) == [1, 2, 3]


def test_boundary_of_binary_tree_left_chain_counts_leaf_once():
    tree = build_tree_from_level_order([1, 2, None, 3, None, 4])
    assert boundary_of_binary_tree(tree) == [1, 2, 3, 4]


def test_boundary_of_binary_tree_empty():
    assert boundary_of_binary_tree(None) == []
