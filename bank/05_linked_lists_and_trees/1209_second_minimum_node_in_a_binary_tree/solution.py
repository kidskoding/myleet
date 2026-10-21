from tree_node import TreeNode


def find_second_minimum_value(root: TreeNode | None) -> int:
    if root is None:
        return -1
    ans = -1
    minimum = root.val

    def dfs(node: TreeNode | None) -> None:
        nonlocal ans
        if node is None:
            return
        if node.val > minimum:
            ans = node.val if ans == -1 else min(ans, node.val)
            return
        dfs(node.left)
        dfs(node.right)

    dfs(root)
    return ans
