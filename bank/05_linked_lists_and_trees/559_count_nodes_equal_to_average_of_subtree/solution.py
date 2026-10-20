from tree_node import TreeNode


def average_of_subtree(root: TreeNode | None) -> int:
    matches = 0

    def walk(node: TreeNode | None) -> tuple[int, int]:
        nonlocal matches
        if node is None:
            return 0, 0
        left_sum, left_count = walk(node.left)
        right_sum, right_count = walk(node.right)
        total = left_sum + right_sum + node.val
        count = left_count + right_count + 1
        if total // count == node.val:
            matches += 1
        return total, count

    walk(root)
    return matches
