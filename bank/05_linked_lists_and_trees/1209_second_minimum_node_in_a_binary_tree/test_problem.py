from binary_tree import build_tree_from_level_order
from solution import find_second_minimum_value


def test_find_second_minimum_value_exists():
    assert find_second_minimum_value(build_tree_from_level_order([2, 2, 5, None, None, 5, 7])) == 5


def test_find_second_minimum_value_all_same():
    assert find_second_minimum_value(build_tree_from_level_order([2, 2, 2])) == -1


def test_find_second_minimum_value_single():
    assert find_second_minimum_value(build_tree_from_level_order([1])) == -1


def test_find_second_minimum_value_picks_smallest_above_root():
    assert find_second_minimum_value(build_tree_from_level_order([2, 2, 3])) == 3
