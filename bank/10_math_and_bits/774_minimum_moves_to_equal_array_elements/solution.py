def min_moves(nums: list[int]) -> int:
    return sum(nums) - len(nums) * min(nums)
