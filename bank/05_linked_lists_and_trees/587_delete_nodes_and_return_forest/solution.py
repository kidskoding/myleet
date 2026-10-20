from tree_node import TreeNode


def del_nodes(root: TreeNode | None, to_delete: list[int]) -> list[TreeNode]:
    doomed = set(to_delete)
    forest: list[TreeNode] = []

    def prune(node: TreeNode | None) -> TreeNode | None:
        if node is None:
            return None
        node.left = prune(node.left)
        node.right = prune(node.right)
        if node.val not in doomed:
            return node
        if node.left is not None:
            forest.append(node.left)
        if node.right is not None:
            forest.append(node.right)
        return None

    kept = prune(root)
    if kept is not None:
        forest.append(kept)
    return forest
