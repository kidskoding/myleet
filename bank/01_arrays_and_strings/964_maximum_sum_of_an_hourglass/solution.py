def max_sum(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    best = 0
    for i in range(m - 2):
        for j in range(n - 2):
            total = sum(grid[i][j : j + 3]) + grid[i + 1][j + 1] + sum(grid[i + 2][j : j + 3])
            best = max(best, total)
    return best
