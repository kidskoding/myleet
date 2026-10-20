def length_of_longest_subsequence(nums: list[int], target: int) -> int:
    dp = [-1] * (target + 1)
    dp[0] = 0
    for x in nums:
        for s in range(target, x - 1, -1):
            if dp[s - x] >= 0:
                dp[s] = max(dp[s], dp[s - x] + 1)
    return dp[target]
