from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import upside_down_binary_tree


def flip(values: list[int | None]) -> list[int | None]:
    return tree_to_level_order(upside_down_binary_tree(build_tree_from_level_order(values)))


def test_upside_down_binary_tree_example():
    assert flip([1, 2, 3, 4, 5]) == [4, 5, 2, None, None, 3, 1]


def test_upside_down_binary_tree_empty():
    assert flip([]) == []


def test_upside_down_binary_tree_single():
    assert flip([1]) == [1]


def test_upside_down_binary_tree_left_child_only():
    assert flip([1, 2]) == [2, None, 1]


def test_upside_down_binary_tree_three_nodes():
    assert flip([1, 2, 3]) == [2, 3, 1]


def test_upside_down_binary_tree_left_chain():
    assert flip([1, 2, None, 3]) == [3, None, 2, None, 1]
