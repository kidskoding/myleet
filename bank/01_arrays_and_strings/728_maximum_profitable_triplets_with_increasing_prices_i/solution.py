def max_profit(prices: list[int], profits: list[int]) -> int:
    n = len(prices)
    best = -1
    for j in range(1, n - 1):
        left = max((profits[i] for i in range(j) if prices[i] < prices[j]), default=0)
        right = max((profits[k] for k in range(j + 1, n) if prices[k] > prices[j]), default=0)
        if left and right:
            best = max(best, left + profits[j] + right)
    return best
