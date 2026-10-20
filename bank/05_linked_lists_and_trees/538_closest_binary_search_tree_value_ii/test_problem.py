from binary_tree import build_tree_from_level_order
from solution import closest_k_values


def test_closest_k_values_example():
    assert sorted(closest_k_values(build_tree_from_level_order([4, 2, 5, 1, 3]), 3.714286, 2)) == [3, 4]


def test_closest_k_values_single_node():
    assert closest_k_values(build_tree_from_level_order([1]), 0.0, 1) == [1]


def test_closest_k_values_all_nodes():
    assert sorted(closest_k_values(build_tree_from_level_order([2, 1, 3]), 10.0, 3)) == [1, 2, 3]


def test_closest_k_values_left_edge():
    assert sorted(closest_k_values(build_tree_from_level_order([4, 2, 5, 1, 3]), 0.5, 2)) == [1, 2]


def test_closest_k_values_right_edge():
    tree = build_tree_from_level_order([8, 3, 10, 1, 6, None, 14])
    assert sorted(closest_k_values(tree, 13.0, 3)) == [8, 10, 14]


def test_closest_k_values_window_in_middle():
    tree = build_tree_from_level_order([8, 3, 10, 1, 6, None, 14])
    assert sorted(closest_k_values(tree, 6.8, 3)) == [6, 8, 10]
