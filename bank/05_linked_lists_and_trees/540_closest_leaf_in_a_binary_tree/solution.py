from collections import deque

from tree_node import TreeNode


def find_closest_leaf(root: TreeNode, k: int) -> int:
    parent: dict[TreeNode, TreeNode | None] = {root: None}
    source = root
    stack = [root]
    while stack:
        node = stack.pop()
        if node.val == k:
            source = node
        for child in (node.left, node.right):
            if child is not None:
                parent[child] = node
                stack.append(child)
    seen = {source}
    queue = deque([source])
    while queue:
        node = queue.popleft()
        if node.left is None and node.right is None:
            return node.val
        for nxt in (node.left, node.right, parent[node]):
            if nxt is not None and nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return root.val
