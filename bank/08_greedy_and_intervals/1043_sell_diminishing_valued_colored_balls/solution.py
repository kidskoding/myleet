def max_profit(inventory: list[int], orders: int) -> int:
    mod = 10**9 + 7

    def sold_above(t: int) -> int:
        return sum(x - t for x in inventory if x > t)

    lo, hi = 0, max(inventory)
    while lo < hi:
        mid = (lo + hi) // 2
        if sold_above(mid) <= orders:
            hi = mid
        else:
            lo = mid + 1
    t = lo
    total = sum((x + t + 1) * (x - t) // 2 for x in inventory if x > t)
    total += (orders - sold_above(t)) * t
    return total % mod
