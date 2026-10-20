def max_score(nums: list[int]) -> int:
    total = sum(nums)
    if len(nums) % 2:
        return total - min(nums)
    return total - min(a + b for a, b in zip(nums, nums[1:]))
