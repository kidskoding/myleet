from __future__ import annotations


class Node:
    def __init__(
        self,
        val: bool,
        isLeaf: bool,
        topLeft: Node | None = None,
        topRight: Node | None = None,
        bottomLeft: Node | None = None,
        bottomRight: Node | None = None,
    ) -> None:
        self.val = val
        self.isLeaf = isLeaf
        self.topLeft = topLeft
        self.topRight = topRight
        self.bottomLeft = bottomLeft
        self.bottomRight = bottomRight


def construct(grid: list[list[int]]) -> Node | None:
    # Problem 53: Construct Quad Tree
    # Time:
    # Space:

    raise NotImplementedError
