from tree_node import TreeNode


def lowest_common_ancestor(
    root: TreeNode | None, p: TreeNode, q: TreeNode
) -> TreeNode | None:
    ans: TreeNode | None = None

    def dfs(node: TreeNode | None) -> bool:
        nonlocal ans
        if node is None:
            return False
        left = dfs(node.left)
        right = dfs(node.right)
        mid = node is p or node is q
        if left and right:
            ans = node
        if (left or right) and mid:
            ans = node
        return left or right or mid

    dfs(root)
    return ans
