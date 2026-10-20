from tree_node import TreeNode


def evaluate_tree(root: TreeNode | None) -> bool:
    if root is None:
        return False
    if root.left is None or root.right is None:
        return root.val == 1
    left = evaluate_tree(root.left)
    right = evaluate_tree(root.right)
    return left or right if root.val == 2 else left and right
