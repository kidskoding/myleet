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
    # Time: O(n^2 log n) worst case with naive scans; O(n^2) with care
    # Space: O(n^2)

    def build(r0: int, c0: int, size: int) -> Node:
        if size == 1:
            return Node(bool(grid[r0][c0]), True)

        half = size // 2
        tl = build(r0, c0, half)
        tr = build(r0, c0 + half, half)
        bl = build(r0 + half, c0, half)
        br = build(r0 + half, c0 + half, half)

        if (
            tl.isLeaf
            and tr.isLeaf
            and bl.isLeaf
            and br.isLeaf
            and tl.val == tr.val == bl.val == br.val
        ):
            return Node(tl.val, True)
        return Node(True, False, tl, tr, bl, br)

    if not grid:
        return None
    return build(0, 0, len(grid))
