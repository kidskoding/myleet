from binary_tree import build_tree_from_level_order
from solution import is_complete_tree


def test_is_complete_tree_last_level_filled_left():
    assert is_complete_tree(build_tree_from_level_order([1, 2, 3, 4, 5, 6])) is True


def test_is_complete_tree_gap_in_last_level():
    assert is_complete_tree(build_tree_from_level_order([1, 2, 3, 4, 5, None, 7])) is False


def test_is_complete_tree_single():
    assert is_complete_tree(build_tree_from_level_order([1])) is True


def test_is_complete_tree_only_right_child():
    assert is_complete_tree(build_tree_from_level_order([1, None, 2])) is False


def test_is_complete_tree_only_left_child():
    assert is_complete_tree(build_tree_from_level_order([1, 2])) is True


def test_is_complete_tree_gap_before_later_node():
    assert is_complete_tree(build_tree_from_level_order([1, 2, 3, 4, None, 5])) is False
