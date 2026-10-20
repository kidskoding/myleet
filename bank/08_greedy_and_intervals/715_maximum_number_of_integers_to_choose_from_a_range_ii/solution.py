def max_count(banned: list[int], n: int, max_sum: int) -> int:
    walls = [0] + sorted({b for b in banned if b <= n}) + [n + 1]
    count = 0
    remaining = max_sum
    for left, right in zip(walls, walls[1:]):
        lo, hi = 0, right - left - 1
        while lo < hi:
            take = (lo + hi + 1) // 2
            if take * left + take * (take + 1) // 2 <= remaining:
                lo = take
            else:
                hi = take - 1
        count += lo
        remaining -= lo * left + lo * (lo + 1) // 2
        if lo < right - left - 1:
            break
    return count
