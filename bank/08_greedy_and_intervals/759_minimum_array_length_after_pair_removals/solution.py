from collections import Counter


def min_length_after_removals(nums: list[int]) -> int:
    n = len(nums)
    most = max(Counter(nums).values())
    return 2 * most - n if 2 * most > n else n % 2
