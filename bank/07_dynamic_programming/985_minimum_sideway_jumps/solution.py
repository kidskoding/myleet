def min_side_jumps(obstacles: list[int]) -> int:
    inf = float("inf")
    dp = [1, 0, 1]
    for obstacle in obstacles[1:]:
        if obstacle:
            dp[obstacle - 1] = inf
        best = min(dp)
        for lane in range(3):
            if lane != obstacle - 1:
                dp[lane] = min(dp[lane], best + 1)
    return int(min(dp))
