from __future__ import annotations


class Node:
    def __init__(self, val: int = 0, children: list[Node] | None = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def diameter(root: Node | None) -> int:
    # Problem 207: Diameter of N-Ary Tree

    # Time:
    # Space:

    raise NotImplementedError
