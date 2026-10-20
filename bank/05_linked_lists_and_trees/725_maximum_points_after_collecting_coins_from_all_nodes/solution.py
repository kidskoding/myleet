def maximum_points(edges: list[list[int]], coins: list[int], k: int) -> int:
    cap = 15
    n = len(coins)
    adj: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    parent = [-1] * n
    order = [0]
    for node in order:
        for nxt in adj[node]:
            if nxt != parent[node]:
                parent[nxt] = node
                order.append(nxt)
    dp = [[0] * (cap + 1) for _ in range(n)]
    for node in reversed(order):
        children = [c for c in adj[node] if c != parent[node]]
        for h in range(cap + 1):
            value = coins[node] >> h
            keep = value - k + sum(dp[c][h] for c in children)
            deeper = min(h + 1, cap)
            halve = (value >> 1) + sum(dp[c][deeper] for c in children)
            dp[node][h] = max(keep, halve)
    return dp[0][0]
