from collections import Counter


def find_smallest_integer(nums: list[int], value: int) -> int:
    counts = Counter(x % value for x in nums)
    m = 0
    while counts[m % value] > 0:
        counts[m % value] -= 1
        m += 1
    return m
