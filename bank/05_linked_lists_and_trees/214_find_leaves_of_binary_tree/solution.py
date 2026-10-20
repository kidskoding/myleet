from tree_node import TreeNode


def find_leaves(root: TreeNode | None) -> list[list[int]]:
    rounds: list[list[int]] = []

    def height(node: TreeNode | None) -> int:
        if node is None:
            return -1
        h = max(height(node.left), height(node.right)) + 1
        if h == len(rounds):
            rounds.append([])
        rounds[h].append(node.val)
        return h

    height(root)
    return rounds
