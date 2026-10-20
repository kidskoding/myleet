from tree_node import TreeNode


def find_target(root: TreeNode | None, k: int) -> bool:
    values: list[int] = []
    stack: list[TreeNode] = []
    node = root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        values.append(node.val)
        node = node.right
    lo, hi = 0, len(values) - 1
    while lo < hi:
        total = values[lo] + values[hi]
        if total == k:
            return True
        if total < k:
            lo += 1
        else:
            hi -= 1
    return False
