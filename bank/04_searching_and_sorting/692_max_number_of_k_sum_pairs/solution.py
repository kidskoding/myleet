from collections import Counter


def max_operations(nums: list[int], k: int) -> int:
    waiting: Counter[int] = Counter()
    pairs = 0
    for x in nums:
        if waiting[k - x] > 0:
            waiting[k - x] -= 1
            pairs += 1
        else:
            waiting[x] += 1
    return pairs
