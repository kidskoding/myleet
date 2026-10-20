MOD = 10**9 + 7


def sum_of_power(nums: list[int], k: int) -> int:
    dp = [0] * (k + 1)
    dp[0] = 1
    for x in nums:
        for s in range(k, -1, -1):
            dp[s] = (2 * dp[s] + (dp[s - x] if s >= x else 0)) % MOD
    return dp[k]
