from collections import deque


def highest_ranked_k_items(grid: list[list[int]], pricing: list[int], start: list[int], k: int) -> list[list[int]]:
    m, n = len(grid), len(grid[0])
    low, high = pricing
    sr, sc = start
    seen = [[False] * n for _ in range(m)]
    seen[sr][sc] = True
    queue: deque[tuple[int, int, int]] = deque([(sr, sc, 0)])
    items = []
    while queue:
        r, c, d = queue.popleft()
        if low <= grid[r][c] <= high:
            items.append((d, grid[r][c], r, c))
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < m and 0 <= nc < n and not seen[nr][nc] and grid[nr][nc] != 0:
                seen[nr][nc] = True
                queue.append((nr, nc, d + 1))
    items.sort()
    return [[r, c] for _, _, r, c in items[:k]]
