from __future__ import annotations


class Node:
    def __init__(self, val: int = 0, children: list[Node] | None = None) -> None:
        self.val = val
        self.children = children if children is not None else []


class Codec:
    def serialize(self, root: Node | None) -> str:
        if root is None:
            return ""
        out: list[str] = []
        stack = [root]
        while stack:
            node = stack.pop()
            out.append(str(node.val))
            out.append(str(len(node.children)))
            stack.extend(reversed(node.children))
        return " ".join(out)

    def deserialize(self, data: str) -> Node | None:
        tokens = iter(int(t) for t in data.split())
        first = next(tokens, None)
        if first is None:
            return None
        root = Node(first)
        stack = [(root, next(tokens))]
        while stack:
            node, remaining = stack[-1]
            if remaining == 0:
                stack.pop()
                continue
            stack[-1] = (node, remaining - 1)
            child = Node(next(tokens))
            node.children.append(child)
            stack.append((child, next(tokens)))
        return root
