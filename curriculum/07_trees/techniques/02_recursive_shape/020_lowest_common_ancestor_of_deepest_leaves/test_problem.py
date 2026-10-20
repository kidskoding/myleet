from binary_tree import build_tree_from_level_order
from solution import lca_deepest_leaves
from tree_node import TreeNode


def test_lca_deepest_leaves_normal():
    root = build_tree_from_level_order([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
    assert lca_deepest_leaves(root).val == 2


def test_lca_deepest_leaves_single_node():
    assert lca_deepest_leaves(TreeNode(1)).val == 1
