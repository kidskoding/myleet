def min_operations(initial: str, target: str) -> int:
    m, n = len(initial), len(target)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    longest = 0
    for i, a in enumerate(initial, 1):
        for j, b in enumerate(target, 1):
            if a == b:
                dp[i][j] = dp[i - 1][j - 1] + 1
                longest = max(longest, dp[i][j])
    return m + n - 2 * longest
