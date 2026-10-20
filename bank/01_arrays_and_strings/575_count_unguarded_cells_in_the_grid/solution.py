EMPTY, GUARD, WALL, SEEN = 0, 1, 2, 3


def count_unguarded(m: int, n: int, guards: list[list[int]], walls: list[list[int]]) -> int:
    grid = [[EMPTY] * n for _ in range(m)]
    for r, c in guards:
        grid[r][c] = GUARD
    for r, c in walls:
        grid[r][c] = WALL
    for r, c in guards:
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            x, y = r + dr, c + dc
            while 0 <= x < m and 0 <= y < n and grid[x][y] in (EMPTY, SEEN):
                grid[x][y] = SEEN
                x, y = x + dr, y + dc
    return sum(row.count(EMPTY) for row in grid)
