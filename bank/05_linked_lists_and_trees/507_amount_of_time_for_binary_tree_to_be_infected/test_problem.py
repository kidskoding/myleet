from binary_tree import build_tree_from_level_order
from solution import amount_of_time


def test_amount_of_time_example():
    root = build_tree_from_level_order([1, 5, 3, None, 4, 10, 6, 9, 2])
    assert amount_of_time(root, 3) == 4


def test_amount_of_time_single_node():
    assert amount_of_time(build_tree_from_level_order([1]), 1) == 0


def test_amount_of_time_start_at_root():
    root = build_tree_from_level_order([1, 2, 3, 4])
    assert amount_of_time(root, 1) == 2


def test_amount_of_time_start_at_deep_leaf():
    root = build_tree_from_level_order([1, 2, 3, 4, None, None, 5])
    assert amount_of_time(root, 4) == 4


def test_amount_of_time_chain_from_middle():
    root = build_tree_from_level_order([1, 2, None, 3, None, 4, None, 5])
    assert amount_of_time(root, 3) == 2
