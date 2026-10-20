from binary_tree import build_tree_from_level_order
from solution import find_closest_leaf


def test_find_closest_leaf_tie_accepts_either():
    assert find_closest_leaf(build_tree_from_level_order([1, 3, 2]), 1) in {2, 3}


def test_find_closest_leaf_root_is_leaf():
    assert find_closest_leaf(build_tree_from_level_order([1]), 1) == 1


def test_find_closest_leaf_goes_up_through_root():
    tree = build_tree_from_level_order([1, 2, 3, 4, None, None, None, 5, None, 6])
    assert find_closest_leaf(tree, 2) == 3


def test_find_closest_leaf_target_is_leaf():
    tree = build_tree_from_level_order([1, 2, 3, None, None, 4, 5])
    assert find_closest_leaf(tree, 4) == 4


def test_find_closest_leaf_shallow_side():
    tree = build_tree_from_level_order([1, 2, 3, None, None, 4, 5])
    assert find_closest_leaf(tree, 1) == 2


def test_find_closest_leaf_below_beats_sibling_branch():
    tree = build_tree_from_level_order([1, 2, 3, 4, 5, None, None, 6, None, None, None, 7, None, 8])
    assert find_closest_leaf(tree, 4) == 5
