from binary_tree import tree_to_level_order
from solution import str2tree


def test_str2tree_example_one():
    assert tree_to_level_order(str2tree("4(2(3)(1))(6(5))")) == [4, 2, 6, 3, 1, 5]


def test_str2tree_full_tree():
    assert tree_to_level_order(str2tree("4(2(3)(1))(6(5)(7))")) == [4, 2, 6, 3, 1, 5, 7]


def test_str2tree_negative_root():
    assert tree_to_level_order(str2tree("-4(2(3)(1))(6(5)(7))")) == [-4, 2, 6, 3, 1, 5, 7]


def test_str2tree_empty():
    assert str2tree("") is None


def test_str2tree_single_multi_digit():
    assert tree_to_level_order(str2tree("123")) == [123]


def test_str2tree_left_chain_with_negatives():
    assert tree_to_level_order(str2tree("10(-20(30))")) == [10, -20, None, 30]
