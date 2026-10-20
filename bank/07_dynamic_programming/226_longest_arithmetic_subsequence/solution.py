def longest_arith_seq_length(nums: list[int]) -> int:
    dp: list[dict[int, int]] = [{} for _ in nums]
    best = 2 if len(nums) >= 2 else len(nums)
    for i in range(len(nums)):
        for j in range(i):
            diff = nums[i] - nums[j]
            dp[i][diff] = dp[j].get(diff, 1) + 1
            best = max(best, dp[i][diff])
    return best
