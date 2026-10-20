from collections import defaultdict


def maximum_subarray_sum(nums: list[int], k: int) -> int:
    counts: dict[int, int] = defaultdict(int)
    window = 0
    best = 0
    for i, value in enumerate(nums):
        counts[value] += 1
        window += value
        if i >= k:
            old = nums[i - k]
            counts[old] -= 1
            if counts[old] == 0:
                del counts[old]
            window -= old
        if i >= k - 1 and len(counts) == k:
            best = max(best, window)
    return best
