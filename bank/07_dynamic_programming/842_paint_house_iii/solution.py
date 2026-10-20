def min_cost(houses: list[int], cost: list[list[int]], m: int, n: int, target: int) -> int:
    inf = float("inf")
    dp = [[inf] * (target + 1) for _ in range(n + 1)]
    for color in range(1, n + 1):
        if houses[0] in (0, color):
            dp[color][1] = 0 if houses[0] else cost[0][color - 1]
    for i in range(1, m):
        nxt = [[inf] * (target + 1) for _ in range(n + 1)]
        for color in range(1, n + 1):
            if houses[i] not in (0, color):
                continue
            paint = 0 if houses[i] else cost[i][color - 1]
            for groups in range(1, target + 1):
                best = dp[color][groups]
                for prev in range(1, n + 1):
                    if prev != color and dp[prev][groups - 1] < best:
                        best = dp[prev][groups - 1]
                if best < inf:
                    nxt[color][groups] = best + paint
        dp = nxt
    answer = min(dp[color][target] for color in range(1, n + 1))
    return -1 if answer == inf else answer
