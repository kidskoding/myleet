from tree_node import TreeNode


def upside_down_binary_tree(root: TreeNode | None) -> TreeNode | None:
    node = root
    parent: TreeNode | None = None
    parent_right: TreeNode | None = None
    while node is not None:
        nxt = node.left
        node.left = parent_right
        parent_right = node.right
        node.right = parent
        parent = node
        node = nxt
    return parent
