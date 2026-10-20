class NaryNode:
    # Shared node for the N-ary traversal problems in this file.
    def __init__(self, val: int = 0, children: "list[NaryNode] | None" = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def nary_level_order(root: NaryNode | None) -> list[list[int]]:
    # Problem 7: N-ary Tree Level Order Traversal
    # Time:
    # Space:

    raise NotImplementedError
