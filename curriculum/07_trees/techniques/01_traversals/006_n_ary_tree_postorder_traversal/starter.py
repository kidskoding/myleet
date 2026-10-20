class NaryNode:
    # Shared node for the N-ary traversal problems in this file.
    def __init__(self, val: int = 0, children: "list[NaryNode] | None" = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def nary_postorder(root: NaryNode | None) -> list[int]:
    # Problem 6: N-ary Tree Postorder Traversal
    # Time:
    # Space:

    raise NotImplementedError
