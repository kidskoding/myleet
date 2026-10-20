from collections import defaultdict, deque

from tree_node import TreeNode


def vertical_order(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    columns: dict[int, list[int]] = defaultdict(list)
    queue: deque[tuple[TreeNode, int]] = deque([(root, 0)])
    while queue:
        node, col = queue.popleft()
        columns[col].append(node.val)
        if node.left is not None:
            queue.append((node.left, col - 1))
        if node.right is not None:
            queue.append((node.right, col + 1))
    return [columns[c] for c in range(min(columns), max(columns) + 1)]
