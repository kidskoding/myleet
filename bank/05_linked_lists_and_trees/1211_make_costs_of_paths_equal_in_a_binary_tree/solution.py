def min_increments(n: int, cost: list[int]) -> int:
    values = cost[:]
    ans = 0
    for i in range(n // 2, 0, -1):
        left, right = 2 * i, 2 * i + 1
        ans += abs(values[left - 1] - values[right - 1])
        values[i - 1] += max(values[left - 1], values[right - 1])
    return ans
