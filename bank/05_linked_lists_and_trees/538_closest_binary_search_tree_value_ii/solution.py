from collections import deque

from tree_node import TreeNode


def closest_k_values(root: TreeNode, target: float, k: int) -> list[int]:
    window: deque[int] = deque()
    stack: list[TreeNode] = []
    node: TreeNode | None = root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        if len(window) < k:
            window.append(node.val)
        elif abs(node.val - target) < abs(window[0] - target):
            window.popleft()
            window.append(node.val)
        else:
            break
        node = node.right
    return list(window)
