from collections import Counter

MOD = 10**9 + 7


def max_frequency_score(nums: list[int], k: int) -> int:
    counts: Counter[int] = Counter()
    score = 0

    def change(x: int, delta: int) -> None:
        nonlocal score
        old = counts[x]
        new = old + delta
        if old:
            score -= pow(x, old, MOD)
        if new:
            score += pow(x, new, MOD)
        score %= MOD
        counts[x] = new

    best = 0
    for i, x in enumerate(nums):
        change(x, 1)
        if i >= k:
            change(nums[i - k], -1)
        if i >= k - 1:
            best = max(best, score)
    return best
