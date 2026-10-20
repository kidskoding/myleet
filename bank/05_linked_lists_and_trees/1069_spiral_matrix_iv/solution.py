from list_node import ListNode


def spiral_matrix(m: int, n: int, head: ListNode | None) -> list[list[int]]:
    grid = [[-1] * n for _ in range(m)]
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    r = c = d = 0
    node = head
    while node is not None:
        grid[r][c] = node.val
        node = node.next
        nr, nc = r + dirs[d][0], c + dirs[d][1]
        if not (0 <= nr < m and 0 <= nc < n and grid[nr][nc] == -1):
            d = (d + 1) % 4
            nr, nc = r + dirs[d][0], c + dirs[d][1]
        r, c = nr, nc
    return grid
