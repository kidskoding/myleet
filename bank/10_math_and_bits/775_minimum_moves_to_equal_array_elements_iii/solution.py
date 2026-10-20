def min_moves(nums: list[int]) -> int:
    return len(nums) * max(nums) - sum(nums)
