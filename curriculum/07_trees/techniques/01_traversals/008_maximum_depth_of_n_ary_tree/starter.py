class NaryNode:
    # Shared node for the N-ary traversal problems in this file.
    def __init__(self, val: int = 0, children: "list[NaryNode] | None" = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def max_depth_nary(root: NaryNode | None) -> int:
    # Problem 8: Maximum Depth of N-ary Tree
    # Time:
    # Space:

    raise NotImplementedError
