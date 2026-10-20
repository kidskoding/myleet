def maximum_score(grid: list[list[int]]) -> int:
    n = len(grid)
    if n == 1:
        return 0
    prefix = [[0] * (n + 1) for _ in range(n)]
    for j in range(n):
        for i in range(n):
            prefix[j][i + 1] = prefix[j][i] + grid[i][j]

    def gain(col: int, low: int, high: int) -> int:
        return prefix[col][high] - prefix[col][low] if high > low else 0

    neg = float("-inf")
    dp = [[neg] * (n + 1) for _ in range(n + 1)]
    for cur in range(n + 1):
        dp[0][cur] = 0

    for col in range(n - 1):
        nxt = [[neg] * (n + 1) for _ in range(n + 1)]
        for cur in range(n + 1):
            best_upto = [neg] * (n + 1)
            running = neg
            for prev in range(n + 1):
                running = max(running, dp[prev][cur])
                best_upto[prev] = running
            best_above = [neg] * (n + 2)
            for prev in range(n, -1, -1):
                best_above[prev] = max(best_above[prev + 1], dp[prev][cur] + gain(col, cur, prev))
            for right in range(n + 1):
                nxt[cur][right] = max(best_upto[right] + gain(col, cur, right), best_above[right + 1])
        dp = nxt

    return max(dp[prev][cur] + gain(n - 1, cur, prev) for prev in range(n + 1) for cur in range(n + 1))
