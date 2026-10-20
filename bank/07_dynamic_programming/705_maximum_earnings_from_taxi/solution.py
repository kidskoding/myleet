def max_taxi_earnings(n: int, rides: list[list[int]]) -> int:
    ending: list[list[tuple[int, int]]] = [[] for _ in range(n + 1)]
    for start, end, tip in rides:
        ending[end].append((start, end - start + tip))
    dp = [0] * (n + 1)
    for point in range(1, n + 1):
        dp[point] = dp[point - 1]
        for start, gain in ending[point]:
            dp[point] = max(dp[point], dp[start] + gain)
    return dp[n]
