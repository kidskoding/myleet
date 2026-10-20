from tree_node import TreeNode


def recover_from_preorder(traversal: str) -> TreeNode | None:
    stack: list[TreeNode] = []
    i, n = 0, len(traversal)
    while i < n:
        depth = 0
        while traversal[i] == "-":
            depth += 1
            i += 1
        start = i
        while i < n and traversal[i] != "-":
            i += 1
        node = TreeNode(int(traversal[start:i]))
        while len(stack) > depth:
            stack.pop()
        if stack:
            parent = stack[-1]
            if parent.left is None:
                parent.left = node
            else:
                parent.right = node
        stack.append(node)
    return stack[0] if stack else None
