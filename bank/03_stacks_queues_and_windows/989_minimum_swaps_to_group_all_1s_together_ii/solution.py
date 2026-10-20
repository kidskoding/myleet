def min_swaps(nums: list[int]) -> int:
    n = len(nums)
    ones = sum(nums)
    if ones == 0:
        return 0
    window = sum(nums[:ones])
    best = window
    for i in range(1, n):
        window += nums[(i + ones - 1) % n] - nums[i - 1]
        best = max(best, window)
    return ones - best
