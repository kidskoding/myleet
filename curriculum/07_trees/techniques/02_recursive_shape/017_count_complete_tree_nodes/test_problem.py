from binary_tree import build_tree_from_level_order
from solution import count_nodes
from tree_node import TreeNode


def test_count_nodes_empty_tree():
    assert count_nodes(None) == 0


def test_count_nodes_single_node():
    assert count_nodes(TreeNode(1)) == 1


def test_count_nodes_full_tree():
    assert count_nodes(build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7])) == 7


def test_count_nodes_last_level_partial():
    assert count_nodes(build_tree_from_level_order([1, 2, 3, 4, 5, 6])) == 6
