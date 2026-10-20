from tree_node import TreeNode


def count_pairs(root: TreeNode | None, distance: int) -> int:
    total = 0

    def dfs(node: TreeNode | None) -> list[int]:
        nonlocal total
        depths = [0] * (distance + 1)
        if node is None:
            return depths
        if node.left is None and node.right is None:
            depths[0] = 1
            return depths
        left, right = dfs(node.left), dfs(node.right)
        for i in range(distance):
            for j in range(distance - i - 1):
                total += left[i] * right[j]
        for k in range(distance):
            depths[k + 1] = left[k] + right[k]
        return depths

    dfs(root)
    return total
