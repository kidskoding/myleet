from binary_tree import build_tree_from_level_order
from solution import lowest_common_ancestor
from tree_node import TreeNode

TREE = [3, 5, 1, 6, 2, 0, 8, None, None, 7, 4]


def find(root: TreeNode | None, val: int) -> TreeNode | None:
    if root is None or root.val == val:
        return root
    return find(root.left, val) or find(root.right, val)


def run(values: list[int | None], targets: list[int]) -> tuple[TreeNode | None, TreeNode | None]:
    root = build_tree_from_level_order(values)
    assert root is not None
    nodes = [find(root, v) for v in targets]
    return root, lowest_common_ancestor(root, nodes)


def test_lowest_common_ancestor_two_deep_nodes():
    root, got = run(TREE, [4, 7])
    assert got is find(root, 2)


def test_lowest_common_ancestor_single_node_is_itself():
    root, got = run(TREE, [1])
    assert got is find(root, 1)


def test_lowest_common_ancestor_many_nodes():
    root, got = run(TREE, [7, 6, 2, 4])
    assert got is find(root, 5)


def test_lowest_common_ancestor_spans_root():
    root, got = run(TREE, [6, 8, 4])
    assert got is root


def test_lowest_common_ancestor_target_is_ancestor_of_other():
    root, got = run(TREE, [5, 4])
    assert got is find(root, 5)


def test_lowest_common_ancestor_single_node_tree():
    root, got = run([9], [9])
    assert got is root
