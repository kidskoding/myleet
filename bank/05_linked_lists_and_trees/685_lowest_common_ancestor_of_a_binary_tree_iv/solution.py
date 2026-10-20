from tree_node import TreeNode


def lowest_common_ancestor(root: TreeNode, nodes: list[TreeNode]) -> TreeNode | None:
    targets = {id(node) for node in nodes}

    def dfs(node: TreeNode | None) -> TreeNode | None:
        if node is None or id(node) in targets:
            return node
        left = dfs(node.left)
        right = dfs(node.right)
        if left is not None and right is not None:
            return node
        return left if left is not None else right

    return dfs(root)
