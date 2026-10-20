def binary_gap(n: int) -> int:
    last = -1
    best = 0
    i = 0
    while n:
        if n & 1:
            if last >= 0:
                best = max(best, i - last)
            last = i
        n >>= 1
        i += 1
    return best
