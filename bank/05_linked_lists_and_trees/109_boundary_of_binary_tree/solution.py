from tree_node import TreeNode


def _is_leaf(node: TreeNode) -> bool:
    return node.left is None and node.right is None


def boundary_of_binary_tree(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    out = [root.val]
    if _is_leaf(root):
        return out

    node = root.left
    while node is not None and not _is_leaf(node):
        out.append(node.val)
        node = node.left if node.left is not None else node.right

    stack = [root]
    while stack:
        cur = stack.pop()
        if cur is not root and _is_leaf(cur):
            out.append(cur.val)
        if cur.right is not None:
            stack.append(cur.right)
        if cur.left is not None:
            stack.append(cur.left)

    right: list[int] = []
    node = root.right
    while node is not None and not _is_leaf(node):
        right.append(node.val)
        node = node.right if node.right is not None else node.left
    out.extend(reversed(right))
    return out
