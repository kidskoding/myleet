def maximum_profit(present: list[int], future: list[int], budget: int) -> int:
    dp = [0] * (budget + 1)
    for cost, value in zip(present, future):
        gain = value - cost
        if gain <= 0:
            continue
        for b in range(budget, cost - 1, -1):
            dp[b] = max(dp[b], dp[b - cost] + gain)
    return dp[budget]
