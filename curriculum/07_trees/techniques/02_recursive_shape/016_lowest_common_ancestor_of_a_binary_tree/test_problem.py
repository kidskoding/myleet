from binary_tree import build_tree_from_level_order
from solution import lowest_common_ancestor


def test_lowest_common_ancestor_split():
    root = build_tree_from_level_order([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
    assert lowest_common_ancestor(root, root.left, root.right).val == 3


def test_lowest_common_ancestor_node_is_its_own_ancestor():
    root = build_tree_from_level_order([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
    assert lowest_common_ancestor(root, root.left, root.left.right.right).val == 5
