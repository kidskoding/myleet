MOD = 10**9 + 7


def count_paths(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    order = sorted(((grid[r][c], r, c) for r in range(rows) for c in range(cols)), reverse=True)
    paths = [[1] * cols for _ in range(rows)]
    for value, r, c in order:
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] > value:
                paths[r][c] = (paths[r][c] + paths[nr][nc]) % MOD
    return sum(sum(row) for row in paths) % MOD
