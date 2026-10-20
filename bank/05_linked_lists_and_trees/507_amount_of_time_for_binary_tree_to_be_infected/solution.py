from collections import deque

from tree_node import TreeNode


def amount_of_time(root: TreeNode | None, start: int) -> int:
    if root is None:
        return 0
    parent: dict[TreeNode, TreeNode | None] = {root: None}
    source = root
    stack = [root]
    while stack:
        node = stack.pop()
        if node.val == start:
            source = node
        for child in (node.left, node.right):
            if child is not None:
                parent[child] = node
                stack.append(child)
    seen = {source}
    queue = deque([source])
    minutes = -1
    while queue:
        minutes += 1
        for _ in range(len(queue)):
            node = queue.popleft()
            for nxt in (node.left, node.right, parent[node]):
                if nxt is not None and nxt not in seen:
                    seen.add(nxt)
                    queue.append(nxt)
    return minutes
