from bisect import bisect_left, insort


def min_absolute_difference(nums: list[int], x: int) -> int:
    seen: list[int] = []
    best = float("inf")
    for i in range(x, len(nums)):
        insort(seen, nums[i - x])
        pos = bisect_left(seen, nums[i])
        if pos < len(seen):
            best = min(best, seen[pos] - nums[i])
        if pos:
            best = min(best, nums[i] - seen[pos - 1])
    return int(best)
