from binary_tree import build_tree_from_level_order
from solution import find_tilt


def test_find_tilt_example_one():
    assert find_tilt(build_tree_from_level_order([1, 2, 3])) == 1


def test_find_tilt_example_two():
    assert find_tilt(build_tree_from_level_order([4, 2, 9, 3, 5, None, 7])) == 15


def test_find_tilt_empty():
    assert find_tilt(None) == 0


def test_find_tilt_single():
    assert find_tilt(build_tree_from_level_order([1])) == 0
