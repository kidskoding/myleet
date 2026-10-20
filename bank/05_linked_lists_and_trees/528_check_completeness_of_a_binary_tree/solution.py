from collections import deque

from tree_node import TreeNode


def is_complete_tree(root: TreeNode | None) -> bool:
    queue: deque[TreeNode | None] = deque([root])
    seen_gap = False
    while queue:
        node = queue.popleft()
        if node is None:
            seen_gap = True
            continue
        if seen_gap:
            return False
        queue.append(node.left)
        queue.append(node.right)
    return True
