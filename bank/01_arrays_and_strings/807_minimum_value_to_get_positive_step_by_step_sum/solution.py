def min_start_value(nums: list[int]) -> int:
    running = lowest = 0
    for v in nums:
        running += v
        lowest = min(lowest, running)
    return 1 - lowest
