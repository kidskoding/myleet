MOD = 10**9 + 7


def count_good_strings(low: int, high: int, zero: int, one: int) -> int:
    dp = [0] * (high + 1)
    dp[0] = 1
    for length in range(1, high + 1):
        if length >= zero:
            dp[length] += dp[length - zero]
        if length >= one:
            dp[length] += dp[length - one]
        dp[length] %= MOD
    return sum(dp[low : high + 1]) % MOD
