def max_number_of_alloys(
    n: int,
    k: int,
    budget: int,
    composition: list[list[int]],
    stock: list[int],
    cost: list[int],
) -> int:
    best = 0
    for need in composition:
        lo, hi = 0, min(stock) + budget
        while lo < hi:
            mid = (lo + hi + 1) // 2
            spend = sum(max(0, mid * need[i] - stock[i]) * cost[i] for i in range(n))
            if spend <= budget:
                lo = mid
            else:
                hi = mid - 1
        best = max(best, lo)
    return best
