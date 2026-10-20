from bisect import bisect_left
from itertools import accumulate


def min_operations(nums: list[int], queries: list[int]) -> list[int]:
    nums = sorted(nums)
    prefix = [0, *accumulate(nums)]
    n = len(nums)
    result = []
    for q in queries:
        i = bisect_left(nums, q)
        left = q * i - prefix[i]
        right = prefix[n] - prefix[i] - q * (n - i)
        result.append(left + right)
    return result
