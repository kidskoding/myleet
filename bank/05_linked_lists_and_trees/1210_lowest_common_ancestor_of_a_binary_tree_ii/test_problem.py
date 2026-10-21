from binary_tree import build_tree_from_level_order
from solution import lowest_common_ancestor
from tree_node import TreeNode

TREE = [3, 5, 1, 6, 2, 0, 8, None, None, 7, 4]


def find(root: TreeNode | None, val: int) -> TreeNode | None:
    if root is None or root.val == val:
        return root
    return find(root.left, val) or find(root.right, val)


def test_lowest_common_ancestor_ii_different_subtrees():
    root = build_tree_from_level_order(TREE)
    assert root is not None
    p = find(root, 5)
    q = find(root, 1)
    assert lowest_common_ancestor(root, p, q) is root


def test_lowest_common_ancestor_ii_one_is_ancestor():
    root = build_tree_from_level_order(TREE)
    assert root is not None
    p = find(root, 5)
    q = find(root, 4)
    assert lowest_common_ancestor(root, p, q) is p


def test_lowest_common_ancestor_ii_missing_node():
    root = build_tree_from_level_order(TREE)
    assert root is not None
    p = find(root, 5)
    q = TreeNode(10)
    assert lowest_common_ancestor(root, p, q) is None
