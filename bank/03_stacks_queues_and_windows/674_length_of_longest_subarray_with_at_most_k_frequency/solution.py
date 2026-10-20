from collections import Counter


def max_subarray_length(nums: list[int], k: int) -> int:
    counts: Counter[int] = Counter()
    left = best = 0
    for right, x in enumerate(nums):
        counts[x] += 1
        while counts[x] > k:
            counts[nums[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
