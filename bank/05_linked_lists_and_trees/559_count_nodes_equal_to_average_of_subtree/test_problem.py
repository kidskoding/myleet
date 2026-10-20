from binary_tree import build_tree_from_level_order
from solution import average_of_subtree


def test_average_of_subtree_example():
    assert average_of_subtree(build_tree_from_level_order([4, 8, 5, 0, 1, None, 6])) == 5


def test_average_of_subtree_single_node():
    assert average_of_subtree(build_tree_from_level_order([1])) == 1


def test_average_of_subtree_root_not_counted():
    assert average_of_subtree(build_tree_from_level_order([1, 2, 3])) == 2


def test_average_of_subtree_all_zero():
    assert average_of_subtree(build_tree_from_level_order([0, 0, 0])) == 3


def test_average_of_subtree_skewed_chain():
    assert average_of_subtree(build_tree_from_level_order([3, None, 2, None, 1])) == 1
