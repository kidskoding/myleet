from binary_tree import build_tree_from_level_order
from solution import connect


def test_connect_links_each_level():
    root = connect(build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7]))

    assert root.next is None
    assert root.left.next.val == 3
    assert root.right.next is None
    assert root.left.left.next.val == 5


def test_connect_empty_tree():
    assert connect(None) is None
