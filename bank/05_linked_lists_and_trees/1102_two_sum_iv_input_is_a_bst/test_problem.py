from binary_tree import build_tree_from_level_order
from solution import find_target


def test_find_target_present():
    assert find_target(build_tree_from_level_order([5, 3, 6, 2, 4, None, 7]), 9) is True


def test_find_target_absent():
    assert find_target(build_tree_from_level_order([5, 3, 6, 2, 4, None, 7]), 28) is False


def test_find_target_single_node_cannot_pair_with_itself():
    assert find_target(build_tree_from_level_order([1]), 2) is False


def test_find_target_leaves():
    assert find_target(build_tree_from_level_order([2, 1, 3]), 4) is True


def test_find_target_negative_values():
    assert find_target(build_tree_from_level_order([0, -1, 2, -3, None, None, 4]), -4) is True
