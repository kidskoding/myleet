from collections import Counter

MOD = 10**9 + 7


def count_pairs(deliciousness: list[int]) -> int:
    seen: Counter[int] = Counter()
    total = 0
    for x in deliciousness:
        for p in range(22):
            total += seen[(1 << p) - x]
        seen[x] += 1
    return total % MOD
