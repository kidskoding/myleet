def smallest_range_ii(nums: list[int], k: int) -> int:
    a = sorted(nums)
    best = a[-1] - a[0]
    for i in range(len(a) - 1):
        hi = max(a[i] + k, a[-1] - k)
        lo = min(a[0] + k, a[i + 1] - k)
        best = min(best, hi - lo)
    return best
