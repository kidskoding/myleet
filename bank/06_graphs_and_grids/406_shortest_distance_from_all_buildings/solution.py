from collections import deque


def shortest_distance(grid: list[list[int]]) -> int:
    # Time: O(B * R * C), one BFS per building.
    # Space: O(R * C).
    rows, cols = len(grid), len(grid[0])
    dist = [[0] * cols for _ in range(rows)]
    reach = [[0] * cols for _ in range(rows)]
    buildings = 0
    for sr in range(rows):
        for sc in range(cols):
            if grid[sr][sc] != 1:
                continue
            buildings += 1
            seen = [[False] * cols for _ in range(rows)]
            queue = deque([(sr, sc, 0)])
            seen[sr][sc] = True
            while queue:
                r, c, d = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and not seen[nr][nc] and grid[nr][nc] == 0:
                        seen[nr][nc] = True
                        dist[nr][nc] += d + 1
                        reach[nr][nc] += 1
                        queue.append((nr, nc, d + 1))
    best = -1
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 and reach[r][c] == buildings and (best == -1 or dist[r][c] < best):
                best = dist[r][c]
    return best
