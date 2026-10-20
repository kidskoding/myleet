from binary_tree import tree_to_level_order
from solution import recover_from_preorder


def test_recover_from_preorder_full_tree():
    root = recover_from_preorder("1-2--3--4-5--6--7")
    assert tree_to_level_order(root) == [1, 2, 5, 3, 4, 6, 7]


def test_recover_from_preorder_left_heavy():
    root = recover_from_preorder("1-2--3---4-5--6---7")
    assert tree_to_level_order(root) == [1, 2, 5, 3, None, 6, None, 4, None, 7]


def test_recover_from_preorder_multi_digit_values():
    root = recover_from_preorder("1-401--349---90--88")
    assert tree_to_level_order(root) == [1, 401, None, 349, 88, 90]


def test_recover_from_preorder_single_node():
    assert tree_to_level_order(recover_from_preorder("5")) == [5]


def test_recover_from_preorder_left_chain():
    root = recover_from_preorder("1-2--3---4")
    assert tree_to_level_order(root) == [1, 2, None, 3, None, 4]
