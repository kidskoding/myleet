from binary_tree import build_tree_from_level_order
from solution import sum_of_left_leaves


def test_sum_of_left_leaves_example():
    assert sum_of_left_leaves(build_tree_from_level_order([3, 9, 20, None, None, 15, 7])) == 24


def test_sum_of_left_leaves_single_root():
    assert sum_of_left_leaves(build_tree_from_level_order([1])) == 0


def test_sum_of_left_leaves_only_left_child():
    assert sum_of_left_leaves(build_tree_from_level_order([1, 2])) == 2


def test_sum_of_left_leaves_only_right_leaf():
    assert sum_of_left_leaves(build_tree_from_level_order([1, None, 2])) == 0


def test_sum_of_left_leaves_negative_values():
    assert sum_of_left_leaves(build_tree_from_level_order([0, -5, 3, -2, 4, -7])) == -9
