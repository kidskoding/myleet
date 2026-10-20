def max_sum_after_partitioning(arr: list[int], k: int) -> int:
    n = len(arr)
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        peak = 0
        for size in range(1, min(k, i) + 1):
            peak = max(peak, arr[i - size])
            dp[i] = max(dp[i], dp[i - size] + peak * size)
    return dp[n]
