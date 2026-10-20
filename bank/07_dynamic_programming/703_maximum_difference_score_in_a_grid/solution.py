def max_score(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    inf = float("inf")
    prefix_min = [[inf] * (cols + 1) for _ in range(rows + 1)]
    best = -inf
    for r in range(rows):
        for c in range(cols):
            before = min(prefix_min[r][c + 1], prefix_min[r + 1][c])
            best = max(best, grid[r][c] - before)
            prefix_min[r + 1][c + 1] = min(before, grid[r][c])
    return int(best)
