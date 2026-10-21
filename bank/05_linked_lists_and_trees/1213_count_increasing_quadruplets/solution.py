def count_quadruplets(nums: list[int]) -> int:
    ans = 0
    dp = [0] * len(nums)
    for k in range(2, len(nums)):
        less = 0
        for j in range(k):
            if nums[j] < nums[k]:
                less += 1
                ans += dp[j]
            elif nums[j] > nums[k]:
                dp[j] += less
    return ans
