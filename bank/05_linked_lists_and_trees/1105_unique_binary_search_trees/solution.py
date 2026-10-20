def num_trees(n: int) -> int:
    dp = [1] + [0] * n
    for nodes in range(1, n + 1):
        for root in range(1, nodes + 1):
            dp[nodes] += dp[root - 1] * dp[nodes - root]
    return dp[n]
