def largest_local(grid: list[list[int]]) -> list[list[int]]:
    n = len(grid)
    return [[max(grid[r][c] for r in range(i, i + 3) for c in range(j, j + 3)) for j in range(n - 2)] for i in range(n - 2)]
