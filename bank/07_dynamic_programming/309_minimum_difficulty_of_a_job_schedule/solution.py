def min_difficulty(job_difficulty: list[int], d: int) -> int:
    n = len(job_difficulty)
    if n < d:
        return -1
    inf = float("inf")
    # dp[i] = best cost for jobs[i:] using the current number of days
    dp = [inf] * (n + 1)
    running = 0
    for i in range(n - 1, -1, -1):
        running = max(running, job_difficulty[i])
        dp[i] = running
    for days_left in range(2, d + 1):
        nxt = [inf] * (n + 1)
        for i in range(n - days_left + 1):
            block_max = 0
            for j in range(i, n - days_left + 1):
                block_max = max(block_max, job_difficulty[j])
                nxt[i] = min(nxt[i], block_max + dp[j + 1])
        dp = nxt
    return int(dp[0])
