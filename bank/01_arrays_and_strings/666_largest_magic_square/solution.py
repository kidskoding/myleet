def largest_magic_square(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    row_pre = [[0] * (n + 1) for _ in range(m)]
    col_pre = [[0] * n for _ in range(m + 1)]
    for r in range(m):
        for c in range(n):
            row_pre[r][c + 1] = row_pre[r][c] + grid[r][c]
            col_pre[r + 1][c] = col_pre[r][c] + grid[r][c]

    def is_magic(r: int, c: int, k: int) -> bool:
        target = row_pre[r][c + k] - row_pre[r][c]
        for i in range(r, r + k):
            if row_pre[i][c + k] - row_pre[i][c] != target:
                return False
        for j in range(c, c + k):
            if col_pre[r + k][j] - col_pre[r][j] != target:
                return False
        main = sum(grid[r + i][c + i] for i in range(k))
        anti = sum(grid[r + i][c + k - 1 - i] for i in range(k))
        return main == target and anti == target

    for k in range(min(m, n), 1, -1):
        for r in range(m - k + 1):
            for c in range(n - k + 1):
                if is_magic(r, c, k):
                    return k
    return 1
