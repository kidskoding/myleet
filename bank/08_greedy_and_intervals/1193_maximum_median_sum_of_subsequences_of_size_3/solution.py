def maximum_median_sum(nums: list[int]) -> int:
    ordered = sorted(nums)
    return sum(ordered[len(ordered) // 3 :: 2])
