def min_removal(nums: list[int], k: int) -> int:
    nums = sorted(nums)
    best = left = 0
    for right, value in enumerate(nums):
        while value > k * nums[left]:
            left += 1
        best = max(best, right - left + 1)
    return len(nums) - best
