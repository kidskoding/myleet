from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import merge_trees


def merged(a: list, b: list) -> list:
    return tree_to_level_order(merge_trees(build_tree_from_level_order(a), build_tree_from_level_order(b)))


def test_merge_trees_overlapping():
    assert merged([1, 3, 2, 5], [2, 1, 3, None, 4, None, 7]) == [3, 4, 5, 5, 4, None, 7]


def test_merge_trees_second_deeper():
    assert merged([1], [1, 2]) == [2, 2]


def test_merge_trees_both_empty():
    assert merged([], []) == []


def test_merge_trees_first_empty():
    assert merged([], [4, None, 6]) == [4, None, 6]


def test_merge_trees_negative_values_cancel():
    assert merged([5, -3], [-5, 3, 1]) == [0, 0, 1]
