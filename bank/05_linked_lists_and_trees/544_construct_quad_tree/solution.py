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
    def build(r: int, c: int, size: int) -> Node:
        if size == 1:
            return Node(bool(grid[r][c]), True)
        half = size // 2
        parts = [build(r, c, half), build(r, c + half, half), build(r + half, c, half), build(r + half, c + half, half)]
        if all(p.is_leaf for p in parts) and len({p.val for p in parts}) == 1:
            return Node(parts[0].val, True)
        return Node(True, False, *parts)

    return build(0, 0, len(grid))
