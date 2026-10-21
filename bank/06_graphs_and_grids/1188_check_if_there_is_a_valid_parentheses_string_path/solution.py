def has_valid_path(grid: list[list[str]]) -> bool:
    m, n = len(grid), len(grid[0])
    if (m + n - 1) % 2 == 1:
        return False
    if grid[0][0] == ")" or grid[m - 1][n - 1] == "(":
        return False
    memo: set[tuple[int, int, int]] = set()

    def dfs(r: int, c: int, bal: int) -> bool:
        if r >= m or c >= n:
            return False
        bal += 1 if grid[r][c] == "(" else -1
        if bal < 0:
            return False
        if r == m - 1 and c == n - 1:
            return bal == 0
        remain = (m - 1 - r) + (n - 1 - c)
        if bal > remain:
            return False
        key = (r, c, bal)
        if key in memo:
            return False
        memo.add(key)
        return dfs(r + 1, c, bal) or dfs(r, c + 1, bal)

    return dfs(0, 0, 0)
