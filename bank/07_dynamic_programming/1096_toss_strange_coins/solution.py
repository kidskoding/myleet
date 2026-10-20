def probability_of_heads(prob: list[float], target: int) -> float:
    dp = [0.0] * (target + 1)
    dp[0] = 1.0
    for p in prob:
        for j in range(target, 0, -1):
            dp[j] = dp[j] * (1 - p) + dp[j - 1] * p
        dp[0] *= 1 - p
    return dp[target]
