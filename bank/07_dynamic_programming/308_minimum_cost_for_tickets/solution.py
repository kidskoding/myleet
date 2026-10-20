from bisect import bisect_left


def mincost_tickets(days: list[int], costs: list[int]) -> int:
    n = len(days)
    dp = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        best = float("inf")
        for length, price in zip((1, 7, 30), costs):
            nxt = bisect_left(days, days[i] + length)
            best = min(best, price + dp[nxt])
        dp[i] = int(best)
    return dp[0]
