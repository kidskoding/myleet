class NaryNode:
    # Shared node for the N-ary traversal problems in this file.
    def __init__(self, val: int = 0, children: "list[NaryNode] | None" = None) -> None:
        self.val = val
        self.children = children if children is not None else []


def nary_preorder(root: NaryNode | None) -> list[int]:
    # Problem 5: N-ary Tree Preorder Traversal
    # Time:
    # Space:

    raise NotImplementedError
