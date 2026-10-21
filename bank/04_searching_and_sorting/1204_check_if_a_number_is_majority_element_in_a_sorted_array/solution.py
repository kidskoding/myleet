from bisect import bisect_left


def is_majority_element(nums: list[int], target: int) -> bool:
    n = len(nums)
    i = bisect_left(nums, target)
    return i + n // 2 < n and nums[i + n // 2] == target
