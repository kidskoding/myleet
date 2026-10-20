from __future__ import annotations


class Node:
    def __init__(
        self,
        val: bool,
        is_leaf: bool,
        top_left: Node | None = None,
        top_right: Node | None = None,
        bottom_left: Node | None = None,
        bottom_right: Node | None = None,
    ) -> None:
        self.val = val
        self.is_leaf = is_leaf
        self.top_left = top_left
        self.top_right = top_right
        self.bottom_left = bottom_left
        self.bottom_right = bottom_right


def construct(grid: list[list[int]]) -> Node:
    # Problem 544: Construct Quad Tree
    # Time:
    # Space:

    raise NotImplementedError
