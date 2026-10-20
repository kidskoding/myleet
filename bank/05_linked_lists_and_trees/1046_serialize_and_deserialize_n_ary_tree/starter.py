from __future__ import annotations


class Node:
    def __init__(self, val: int = 0, children: list[Node] | None = None) -> None:
        self.val = val
        self.children = children if children is not None else []


class Codec:
    # Problem 1046: Serialize and Deserialize N-ary Tree
    # Time:
    # Space:

    def serialize(self, root: Node | None) -> str:
        raise NotImplementedError

    def deserialize(self, data: str) -> Node | None:
        raise NotImplementedError
