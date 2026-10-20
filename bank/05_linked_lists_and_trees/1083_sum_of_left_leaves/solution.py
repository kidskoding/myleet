from tree_node import TreeNode


def sum_of_left_leaves(root: TreeNode | None) -> int:
    total = 0
    stack = [root] if root is not None else []
    while stack:
        node = stack.pop()
        left = node.left
        if left is not None:
            if left.left is None and left.right is None:
                total += left.val
            else:
                stack.append(left)
        if node.right is not None:
            stack.append(node.right)
    return total
