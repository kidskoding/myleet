from binary_tree import build_tree_from_level_order
from solution import lowest_common_ancestor_bst


def test_lowest_common_ancestor_bst_split():
    root = build_tree_from_level_order([6, 2, 8, 0, 4, 7, 9, None, None, 3, 5])
    assert lowest_common_ancestor_bst(root, root.left, root.right).val == 6


def test_lowest_common_ancestor_bst_ancestor_is_node():
    root = build_tree_from_level_order([6, 2, 8, 0, 4, 7, 9, None, None, 3, 5])
    assert lowest_common_ancestor_bst(root, root.left, root.left.right).val == 2
