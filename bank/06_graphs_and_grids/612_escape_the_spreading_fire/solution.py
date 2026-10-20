from collections import deque

INF = float("inf")
DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def maximum_minutes(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    fire = [[INF] * n for _ in range(m)]
    queue = deque()
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                fire[r][c] = 0
                queue.append((r, c))
    while queue:
        r, c = queue.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 0 and fire[nr][nc] == INF:
                fire[nr][nc] = fire[r][c] + 1
                queue.append((nr, nc))

    def escapes(wait: int) -> bool:
        if wait >= fire[0][0]:
            return False
        seen = [[False] * n for _ in range(m)]
        seen[0][0] = True
        queue = deque([(0, 0, wait)])
        while queue:
            r, c, t = queue.popleft()
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if not (0 <= nr < m and 0 <= nc < n) or grid[nr][nc] != 0 or seen[nr][nc]:
                    continue
                arrive = t + 1
                if nr == m - 1 and nc == n - 1:
                    if arrive <= fire[nr][nc]:
                        return True
                    continue
                if arrive < fire[nr][nc]:
                    seen[nr][nc] = True
                    queue.append((nr, nc, arrive))
        return False

    limit = m * n
    if escapes(limit):
        return 10**9
    lo, hi = -1, limit
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if escapes(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
