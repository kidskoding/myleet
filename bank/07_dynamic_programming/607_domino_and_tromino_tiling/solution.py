MOD = 10**9 + 7


def num_tilings(n: int) -> int:
    dp = [1, 1, 2]
    for i in range(3, n + 1):
        dp.append((2 * dp[i - 1] + dp[i - 3]) % MOD)
    return dp[n]
