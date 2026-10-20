from binary_tree import build_tree_from_level_order
from solution import prune_tree
from tree_helpers import preorder_traversal
from tree_node import TreeNode


def test_prune_tree_drops_zero_only_subtrees():
    root = build_tree_from_level_order([1, None, 0, 0, 1])
    assert preorder_traversal(prune_tree(root)) == [1, 0, 1]


def test_prune_tree_removes_everything():
    assert prune_tree(TreeNode(0)) is None
