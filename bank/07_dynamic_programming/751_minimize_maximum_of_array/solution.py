def minimize_array_value(nums: list[int]) -> int:
    best = 0
    total = 0
    for i, value in enumerate(nums):
        total += value
        best = max(best, -(-total // (i + 1)))
    return best
