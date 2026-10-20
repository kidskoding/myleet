import math


def minmax_gas_dist(stations: list[int], k: int) -> float:
    gaps = [b - a for a, b in zip(stations, stations[1:])]

    def needed(limit: float) -> int:
        return sum(math.ceil(gap / limit) - 1 for gap in gaps)

    lo, hi = 0.0, float(max(gaps))
    while hi - lo > 1e-7:
        mid = (lo + hi) / 2
        if needed(mid) <= k:
            hi = mid
        else:
            lo = mid
    return hi
