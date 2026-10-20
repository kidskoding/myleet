from tree_node import TreeNode


def tree_to_doubly_list(root: TreeNode | None) -> TreeNode | None:
    if root is None:
        return None
    head: TreeNode | None = None
    prev: TreeNode | None = None
    stack: list[TreeNode] = []
    node = root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        if prev is None:
            head = node
        else:
            prev.right = node
            node.left = prev
        prev = node
        node = node.right
    assert head is not None and prev is not None
    head.left = prev
    prev.right = head
    return head
