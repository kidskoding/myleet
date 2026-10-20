def min_score_triangulation(values: list[int]) -> int:
    n = len(values)
    dp = [[0] * n for _ in range(n)]
    for gap in range(2, n):
        for i in range(n - gap):
            j = i + gap
            dp[i][j] = min(dp[i][k] + dp[k][j] + values[i] * values[k] * values[j] for k in range(i + 1, j))
    return dp[0][n - 1]
