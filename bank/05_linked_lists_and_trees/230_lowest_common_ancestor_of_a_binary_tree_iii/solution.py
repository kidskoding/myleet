from __future__ import annotations


class Node:
    def __init__(self, val: int, left: Node | None = None, right: Node | None = None, parent: Node | None = None) -> None:
        self.val = val
        self.left = left
        self.right = right
        self.parent = parent


def lowest_common_ancestor(p: Node, q: Node) -> Node:
    a: Node | None = p
    b: Node | None = q
    while a is not b:
        a = a.parent if a is not None else q
        b = b.parent if b is not None else p
    assert a is not None
    return a
