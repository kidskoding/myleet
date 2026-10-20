MOD = 10**9 + 7


def good_binary_strings(min_length: int, max_length: int, one_group: int, zero_group: int) -> int:
    dp = [0] * (max_length + 1)
    dp[0] = 1
    for length in range(1, max_length + 1):
        ways = 0
        if length >= one_group:
            ways += dp[length - one_group]
        if length >= zero_group:
            ways += dp[length - zero_group]
        dp[length] = ways % MOD
    return sum(dp[min_length:]) % MOD
