from __future__ import annotations


class Node:
    def __init__(self, val: int = 0, children: list[Node] | None = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def diameter(root: Node | None) -> int:
    best = 0

    def height(node: Node) -> int:
        nonlocal best
        first = second = 0
        for child in node.children:
            h = height(child) + 1
            if h > first:
                first, second = h, first
            elif h > second:
                second = h
        best = max(best, first + second)
        return first

    if root is None:
        return 0
    height(root)
    return best
