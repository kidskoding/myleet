from collections import Counter


def find_pairs(nums: list[int], k: int) -> int:
    counts = Counter(nums)
    if k == 0:
        return sum(1 for seen in counts.values() if seen > 1)
    return sum(1 for value in counts if value + k in counts)
