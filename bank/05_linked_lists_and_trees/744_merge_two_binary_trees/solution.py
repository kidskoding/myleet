from tree_node import TreeNode


def merge_trees(root1: TreeNode | None, root2: TreeNode | None) -> TreeNode | None:
    if root1 is None:
        return root2
    if root2 is None:
        return root1
    return TreeNode(
        root1.val + root2.val,
        merge_trees(root1.left, root2.left),
        merge_trees(root1.right, root2.right),
    )
