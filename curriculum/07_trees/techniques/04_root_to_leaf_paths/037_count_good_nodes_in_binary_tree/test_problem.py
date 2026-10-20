from binary_tree import build_tree_from_level_order
from solution import good_nodes


def test_good_nodes_normal():
    assert good_nodes(build_tree_from_level_order([3, 1, 4, 3, None, 1, 5])) == 4


def test_good_nodes_left_child_equal():
    assert good_nodes(build_tree_from_level_order([3, 3, None, 4, 2])) == 3


def test_good_nodes_single_node():
    assert good_nodes(build_tree_from_level_order([1])) == 1
