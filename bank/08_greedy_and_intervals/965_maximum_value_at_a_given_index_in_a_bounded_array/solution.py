def _side(peak: int, length: int) -> int:
    if length == 0:
        return 0
    if peak - 1 >= length:
        top = peak - 1
        bottom = peak - length
        return (top + bottom) * length // 2
    slope = peak - 1
    return slope * (slope + 1) // 2 + (length - slope)


def max_value(n: int, index: int, max_sum: int) -> int:
    lo, hi = 1, max_sum
    while lo < hi:
        mid = (lo + hi + 1) // 2
        total = mid + _side(mid, index) + _side(mid, n - index - 1)
        if total <= max_sum:
            lo = mid
        else:
            hi = mid - 1
    return lo
