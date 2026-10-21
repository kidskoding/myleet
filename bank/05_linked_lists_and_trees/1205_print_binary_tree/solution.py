from tree_node import TreeNode


def print_tree(root: TreeNode | None) -> list[list[str]]:
    def height(node: TreeNode | None) -> int:
        if node is None:
            return -1
        return 1 + max(height(node.left), height(node.right))

    h = height(root)
    rows = h + 1
    cols = (1 << (h + 1)) - 1
    grid = [[""] * cols for _ in range(rows)]

    def place(node: TreeNode | None, r: int, c: int) -> None:
        if node is None:
            return
        grid[r][c] = str(node.val)
        if r == h:
            return
        offset = 1 << (h - r - 1)
        place(node.left, r + 1, c - offset)
        place(node.right, r + 1, c + offset)

    place(root, 0, (cols - 1) // 2)
    return grid
