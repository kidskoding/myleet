from __future__ import annotations


class Node:
    def __init__(self, val: int, left: Node | None = None, right: Node | None = None, parent: Node | None = None) -> None:
        self.val = val
        self.left = left
        self.right = right
        self.parent = parent


def inorder_successor(node: Node) -> Node | None:
    # Problem 929: Inorder Successor in BST II
    # Time:
    # Space:

    raise NotImplementedError
