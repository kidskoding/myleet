import heapq
from collections import deque


def maximum_safeness_factor(grid: list[list[int]]) -> int:
    n = len(grid)
    dist = [[-1] * n for _ in range(n)]
    queue: deque[tuple[int, int]] = deque()
    for r in range(n):
        for c in range(n):
            if grid[r][c] == 1:
                dist[r][c] = 0
                queue.append((r, c))
    moves = ((1, 0), (-1, 0), (0, 1), (0, -1))
    while queue:
        r, c = queue.popleft()
        for dr, dc in moves:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1
                queue.append((nr, nc))
    seen = [[False] * n for _ in range(n)]
    heap = [(-dist[0][0], 0, 0)]
    seen[0][0] = True
    while heap:
        neg, r, c = heapq.heappop(heap)
        if r == n - 1 and c == n - 1:
            return -neg
        for dr, dc in moves:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and not seen[nr][nc]:
                seen[nr][nc] = True
                heapq.heappush(heap, (max(neg, -dist[nr][nc]), nr, nc))
    return 0
