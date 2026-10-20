def max_distance(arrays: list[list[int]]) -> int:
    lo, hi = arrays[0][0], arrays[0][-1]
    best = 0
    for arr in arrays[1:]:
        best = max(best, arr[-1] - lo, hi - arr[0])
        lo = min(lo, arr[0])
        hi = max(hi, arr[-1])
    return best
