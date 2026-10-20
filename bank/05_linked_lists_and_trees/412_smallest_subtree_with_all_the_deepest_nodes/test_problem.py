from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import subtree_with_all_deepest


def contains(root, node):
    if root is None:
        return False
    return root is node or contains(root.left, node) or contains(root.right, node)


def test_subtree_with_all_deepest_example():
    root = build_tree_from_level_order([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
    result = subtree_with_all_deepest(root)
    assert tree_to_level_order(result) == [2, 7, 4]
    assert contains(root, result)


def test_subtree_with_all_deepest_single_node():
    root = build_tree_from_level_order([1])
    assert subtree_with_all_deepest(root) is root


def test_subtree_with_all_deepest_single_deepest_leaf():
    root = build_tree_from_level_order([0, 1, 3, None, 2])
    assert tree_to_level_order(subtree_with_all_deepest(root)) == [2]


def test_subtree_with_all_deepest_both_sides_returns_root():
    root = build_tree_from_level_order([1, 2, 3, 4, None, None, 5])
    assert subtree_with_all_deepest(root) is root


def test_subtree_with_all_deepest_skewed():
    root = build_tree_from_level_order([1, 2, None, 3, None, 4])
    assert tree_to_level_order(subtree_with_all_deepest(root)) == [4]
