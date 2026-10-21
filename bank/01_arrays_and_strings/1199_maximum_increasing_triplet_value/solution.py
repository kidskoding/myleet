import bisect


def maximum_triplet_value(nums: list[int]) -> int:
    n = len(nums)
    right = [0] * n
    right[-1] = nums[-1]
    for i in range(n - 2, -1, -1):
        right[i] = max(nums[i], right[i + 1])
    left: list[int] = []
    ans = 0
    for j in range(n - 1):
        if j >= 1 and right[j + 1] > nums[j]:
            idx = bisect.bisect_left(left, nums[j]) - 1
            if idx >= 0:
                ans = max(ans, left[idx] - nums[j] + right[j + 1])
        bisect.insort(left, nums[j])
    return ans
