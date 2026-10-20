from collections import Counter


def destroy_targets(nums: list[int], space: int) -> int:
    count = Counter(x % space for x in nums)
    best = max(count.values())
    return min(x for x in nums if count[x % space] == best)
