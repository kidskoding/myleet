def maximize_sweetness(sweetness: list[int], k: int) -> int:
    def pieces_with_at_least(target: int) -> int:
        pieces = 0
        running = 0
        for s in sweetness:
            running += s
            if running >= target:
                pieces += 1
                running = 0
        return pieces

    lo, hi = min(sweetness), sum(sweetness) // (k + 1)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if pieces_with_at_least(mid) >= k + 1:
            lo = mid
        else:
            hi = mid - 1
    return lo
