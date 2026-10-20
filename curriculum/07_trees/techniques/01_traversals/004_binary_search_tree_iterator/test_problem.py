from binary_tree import build_tree_from_level_order
from solution import BSTIterator
from tree_node import TreeNode


def test_bst_iterator_walks_in_order():
    root = build_tree_from_level_order([7, 3, 15, None, None, 9, 20])
    iterator = BSTIterator(root)

    assert iterator.next() == 3
    assert iterator.next() == 7
    assert iterator.has_next() is True
    assert iterator.next() == 9
    assert iterator.next() == 15
    assert iterator.has_next() is True


def test_bst_iterator_exhausts():
    iterator = BSTIterator(TreeNode(1))

    assert iterator.next() == 1
    assert iterator.has_next() is False
