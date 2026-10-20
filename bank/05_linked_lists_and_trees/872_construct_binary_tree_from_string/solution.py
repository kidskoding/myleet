from tree_node import TreeNode


def str2tree(s: str) -> TreeNode | None:
    root: TreeNode | None = None
    stack: list[TreeNode] = []
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "(":
            i += 1
        elif ch == ")":
            stack.pop()
            i += 1
        else:
            j = i + 1
            while j < n and s[j].isdigit():
                j += 1
            node = TreeNode(int(s[i:j]))
            if stack:
                parent = stack[-1]
                if parent.left is None:
                    parent.left = node
                else:
                    parent.right = node
            else:
                root = node
            stack.append(node)
            i = j
    return root
