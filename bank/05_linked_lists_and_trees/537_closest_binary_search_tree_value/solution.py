from tree_node import TreeNode


def closest_value(root: TreeNode, target: float) -> int:
    best = root.val
    node: TreeNode | None = root
    while node is not None:
        gap, best_gap = abs(node.val - target), abs(best - target)
        if gap < best_gap or (gap == best_gap and node.val < best):
            best = node.val
        node = node.left if target < node.val else node.right
    return best
