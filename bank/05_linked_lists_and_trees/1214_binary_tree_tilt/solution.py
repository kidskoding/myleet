from tree_node import TreeNode


def find_tilt(root: TreeNode | None) -> int:
    ans = 0

    def dfs(node: TreeNode | None) -> int:
        nonlocal ans
        if node is None:
            return 0
        left = dfs(node.left)
        right = dfs(node.right)
        ans += abs(left - right)
        return node.val + left + right

    dfs(root)
    return ans
