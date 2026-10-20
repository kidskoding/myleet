from collections import Counter
from math import gcd


def count_pairs(nums: list[int], k: int) -> int:
    buckets = Counter(gcd(x, k) for x in nums)
    keys = list(buckets)
    total = 0
    for i, a in enumerate(keys):
        for b in keys[i:]:
            if a * b % k:
                continue
            if a == b:
                total += buckets[a] * (buckets[a] - 1) // 2
            else:
                total += buckets[a] * buckets[b]
    return total
