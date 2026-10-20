from tree_node import TreeNode


def find_duplicate_subtrees(root: TreeNode | None) -> list[TreeNode | None]:
    ids: dict[tuple[int, int, int], int] = {}
    counts: dict[int, int] = {}
    result: list[TreeNode | None] = []

    def visit(node: TreeNode | None) -> int:
        if node is None:
            return 0
        key = (visit(node.left), node.val, visit(node.right))
        if key not in ids:
            ids[key] = len(ids) + 1
        uid = ids[key]
        counts[uid] = counts.get(uid, 0) + 1
        if counts[uid] == 2:
            result.append(node)
        return uid

    visit(root)
    return result
