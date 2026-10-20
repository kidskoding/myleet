def min_cost_to_equalize_array(nums: list[int], cost1: int, cost2: int) -> int:
    mod = 10**9 + 7
    n = len(nums)
    high, low = max(nums), min(nums)
    base = high * n - sum(nums)
    if n <= 2 or cost2 >= 2 * cost1:
        return base * cost1 % mod
    best = base * cost1
    for target in range(high, 2 * high + 1):
        total = base + (target - high) * n
        largest = target - low
        if 2 * largest <= total:
            cost = (total // 2) * cost2 + (total % 2) * cost1
        else:
            pairs = total - largest
            cost = pairs * cost2 + (total - 2 * pairs) * cost1
        best = min(best, cost)
    return best % mod
