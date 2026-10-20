def min_absolute_difference(nums: list[int]) -> int:
    last = {1: -1, 2: -1}
    best = -1
    for i, value in enumerate(nums):
        if value in last:
            other = last[3 - value]
            if other != -1 and (best == -1 or i - other < best):
                best = i - other
            last[value] = i
    return best
