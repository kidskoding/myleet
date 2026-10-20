from binary_tree import build_tree_from_level_order
from solution import vertical_order


def test_vertical_order_empty():
    assert vertical_order(None) == []


def test_vertical_order_single_node():
    assert vertical_order(build_tree_from_level_order([5])) == [[5]]


def test_vertical_order_three_nodes():
    assert vertical_order(build_tree_from_level_order([1, 2, 3])) == [[2], [1], [3]]


def test_vertical_order_shared_column_left_to_right():
    tree = build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7])
    assert vertical_order(tree) == [[4], [2], [1, 5, 6], [3], [7]]


def test_vertical_order_shallow_node_before_deep_node():
    tree = build_tree_from_level_order([3, 9, 8, 4, 0, 1, 7, None, None, None, 2, 5])
    assert vertical_order(tree) == [[4], [9, 5], [3, 0, 1], [8, 2], [7]]


def test_vertical_order_right_chain():
    tree = build_tree_from_level_order([1, None, 2, None, 3])
    assert vertical_order(tree) == [[1], [2], [3]]
