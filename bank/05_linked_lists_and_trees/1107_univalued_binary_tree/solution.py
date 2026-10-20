from tree_node import TreeNode


def is_unival_tree(root: TreeNode | None) -> bool:
    if root is None:
        return True
    stack = [root]
    while stack:
        node = stack.pop()
        if node.val != root.val:
            return False
        if node.left is not None:
            stack.append(node.left)
        if node.right is not None:
            stack.append(node.right)
    return True
