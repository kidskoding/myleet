import heapq


def minimum_time(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    if grid[0][1] > 1 and grid[1][0] > 1:
        return -1
    dist = [[float("inf")] * n for _ in range(m)]
    dist[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        t, r, c = heapq.heappop(heap)
        if (r, c) == (m - 1, n - 1):
            return t
        if t > dist[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < m and 0 <= nc < n:
                arrive = t + 1
                if arrive < grid[nr][nc]:
                    arrive = grid[nr][nc] + (grid[nr][nc] - arrive) % 2
                if arrive < dist[nr][nc]:
                    dist[nr][nc] = arrive
                    heapq.heappush(heap, (arrive, nr, nc))
    return -1
