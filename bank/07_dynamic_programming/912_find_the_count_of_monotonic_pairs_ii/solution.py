MOD = 10**9 + 7


def count_of_pairs(nums: list[int]) -> int:
    dp = [1] * (nums[0] + 1)
    for prev, cur in zip(nums, nums[1:]):
        gap = max(0, cur - prev)
        prefix = [0] * (len(dp) + 1)
        for k, ways in enumerate(dp):
            prefix[k + 1] = (prefix[k] + ways) % MOD
        new_dp = [0] * (cur + 1)
        for j in range(cur + 1):
            top = min(j - gap, prev)
            if top >= 0:
                new_dp[j] = prefix[top + 1]
        dp = new_dp
    return sum(dp) % MOD
