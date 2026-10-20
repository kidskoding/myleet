def order_of_largest_plus_sign(n: int, mines: list[list[int]]) -> int:
    banned = {(r, c) for r, c in mines}
    dp = [[n] * n for _ in range(n)]
    for r in range(n):
        run = 0
        for c in range(n):
            run = 0 if (r, c) in banned else run + 1
            dp[r][c] = min(dp[r][c], run)
        run = 0
        for c in range(n - 1, -1, -1):
            run = 0 if (r, c) in banned else run + 1
            dp[r][c] = min(dp[r][c], run)
    for c in range(n):
        run = 0
        for r in range(n):
            run = 0 if (r, c) in banned else run + 1
            dp[r][c] = min(dp[r][c], run)
        run = 0
        for r in range(n - 1, -1, -1):
            run = 0 if (r, c) in banned else run + 1
            dp[r][c] = min(dp[r][c], run)
    return max(max(row) for row in dp)
