def min_operations(nums: list[int]) -> int:
    return sum(max(0, a - b) for a, b in zip(nums, nums[1:]))
