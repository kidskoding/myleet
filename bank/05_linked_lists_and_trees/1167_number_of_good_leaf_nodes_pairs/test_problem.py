from binary_tree import build_tree_from_level_order
from solution import count_pairs


def test_count_pairs_uneven_tree():
    assert count_pairs(build_tree_from_level_order([1, 2, 3, None, 4]), 3) == 1


def test_count_pairs_perfect_tree():
    assert count_pairs(build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7]), 3) == 2


def test_count_pairs_deep_leaf():
    root = build_tree_from_level_order([7, 1, 4, 6, None, 5, 3, None, None, None, None, None, 2])
    assert count_pairs(root, 3) == 1


def test_count_pairs_single_node():
    assert count_pairs(build_tree_from_level_order([1]), 1) == 0


def test_count_pairs_siblings():
    assert count_pairs(build_tree_from_level_order([1, 2, 3]), 2) == 1
    assert count_pairs(build_tree_from_level_order([1, 2, 3]), 1) == 0


def test_count_pairs_large_distance_counts_all():
    assert count_pairs(build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7]), 10) == 6
