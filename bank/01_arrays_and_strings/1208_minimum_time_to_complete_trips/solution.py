def minimum_time(time: list[int], total_trips: int) -> int:
    lo, hi = 1, min(time) * total_trips
    while lo < hi:
        mid = (lo + hi) // 2
        if sum(mid // t for t in time) >= total_trips:
            hi = mid
        else:
            lo = mid + 1
    return lo
