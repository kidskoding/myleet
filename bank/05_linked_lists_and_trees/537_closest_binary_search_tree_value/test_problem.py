from binary_tree import build_tree_from_level_order
from solution import closest_value


def test_closest_value_example():
    assert closest_value(build_tree_from_level_order([4, 2, 5, 1, 3]), 3.714286) == 4


def test_closest_value_single_node():
    assert closest_value(build_tree_from_level_order([1]), 4.428571) == 1


def test_closest_value_tie_takes_smaller():
    assert closest_value(build_tree_from_level_order([4, 2, 5, 1, 3]), 3.5) == 3


def test_closest_value_exact_match():
    assert closest_value(build_tree_from_level_order([8, 3, 10, 1, 6, None, 14]), 6.0) == 6


def test_closest_value_below_minimum():
    assert closest_value(build_tree_from_level_order([8, 3, 10, 1, 6, None, 14]), -7.5) == 1


def test_closest_value_above_maximum():
    assert closest_value(build_tree_from_level_order([8, 3, 10, 1, 6, None, 14]), 99.0) == 14
