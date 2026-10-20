from tree_node import TreeNode


def subtree_with_all_deepest(root: TreeNode | None) -> TreeNode | None:
    # Time: O(n).
    # Space: O(h).
    def dfs(node: TreeNode | None) -> tuple[int, TreeNode | None]:
        if node is None:
            return 0, None
        ld, ln = dfs(node.left)
        rd, rn = dfs(node.right)
        if ld == rd:
            return ld + 1, node
        if ld > rd:
            return ld + 1, ln
        return rd + 1, rn

    return dfs(root)[1]
