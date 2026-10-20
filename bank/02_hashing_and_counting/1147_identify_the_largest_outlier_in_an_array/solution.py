from collections import Counter


def get_largest_outlier(nums: list[int]) -> int:
    total = sum(nums)
    counts = Counter(nums)
    best = None
    for x in counts:
        rest = total - x
        if rest % 2:
            continue
        target = rest // 2
        if counts[target] > (1 if target == x else 0) and (best is None or x > best):
            best = x
    assert best is not None
    return best
