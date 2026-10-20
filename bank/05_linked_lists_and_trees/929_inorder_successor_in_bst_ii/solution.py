from __future__ import annotations


class Node:
    def __init__(self, val: int, left: Node | None = None, right: Node | None = None, parent: Node | None = None) -> None:
        self.val = val
        self.left = left
        self.right = right
        self.parent = parent


def inorder_successor(node: Node) -> Node | None:
    if node.right is not None:
        current = node.right
        while current.left is not None:
            current = current.left
        return current
    current = node
    while current.parent is not None and current.parent.right is current:
        current = current.parent
    return current.parent
