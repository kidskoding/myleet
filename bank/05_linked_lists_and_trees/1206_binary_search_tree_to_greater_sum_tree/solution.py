from tree_node import TreeNode


def bst_to_gst(root: TreeNode | None) -> TreeNode | None:
    total = 0

    def dfs(node: TreeNode | None) -> None:
        nonlocal total
        if node is None:
            return
        dfs(node.right)
        total += node.val
        node.val = total
        dfs(node.left)

    dfs(root)
    return root
