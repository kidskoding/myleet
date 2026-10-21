def range_add_queries(n: int, queries: list[list[int]]) -> list[list[int]]:
    diff = [[0] * (n + 1) for _ in range(n + 1)]
    for r1, c1, r2, c2 in queries:
        diff[r1][c1] += 1
        diff[r1][c2 + 1] -= 1
        diff[r2 + 1][c1] -= 1
        diff[r2 + 1][c2 + 1] += 1
    ans = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            top = ans[i - 1][j] if i else 0
            left = ans[i][j - 1] if j else 0
            corner = ans[i - 1][j - 1] if i and j else 0
            ans[i][j] = top + left - corner + diff[i][j]
    return ans
