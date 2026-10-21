import math


def subarray_lcm(nums: list[int], k: int) -> int:
    n = len(nums)
    ans = 0
    for i in range(n):
        cur = 1
        for j in range(i, n):
            cur = math.lcm(cur, nums[j])
            if cur > k:
                break
            if cur == k:
                ans += 1
    return ans
