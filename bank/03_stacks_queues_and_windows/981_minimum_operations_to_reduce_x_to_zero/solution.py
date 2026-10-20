def min_operations(nums: list[int], x: int) -> int:
    goal = sum(nums) - x
    if goal < 0:
        return -1
    best = -1
    left = 0
    window = 0
    for right, val in enumerate(nums):
        window += val
        while window > goal:
            window -= nums[left]
            left += 1
        if window == goal:
            best = max(best, right - left + 1)
    return -1 if best < 0 else len(nums) - best
