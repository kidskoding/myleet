from collections import deque


def shortest_path(grid: list[list[int]], k: int) -> int:
    # Time: O(R * C * k).
    # Space: O(R * C * k) in the worst case for the queue.
    rows, cols = len(grid), len(grid[0])
    if rows == 1 and cols == 1:
        return 0
    if k >= rows + cols - 2:
        return rows + cols - 2
    best = [[-1] * cols for _ in range(rows)]
    best[0][0] = k
    queue = deque([(0, 0, k, 0)])
    while queue:
        r, c, left, steps = queue.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            nk = left - grid[nr][nc]
            if nk < 0 or nk <= best[nr][nc]:
                continue
            if nr == rows - 1 and nc == cols - 1:
                return steps + 1
            best[nr][nc] = nk
            queue.append((nr, nc, nk, steps + 1))
    return -1
