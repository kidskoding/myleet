def num_of_ways(n: int) -> int:
    # Problem 55: Number of Ways to Paint N × 3 Grid
    # Time: O(n * S^2) with S ≈ 12 valid row patterns
    # Space: O(S)

    mod = 10**9 + 7
    colors = (0, 1, 2)
    patterns: list[tuple[int, int, int]] = []
    for a in colors:
        for b in colors:
            if a == b:
                continue
            for c in colors:
                if b == c:
                    continue
                patterns.append((a, b, c))

    s = len(patterns)
    compatible = [[False] * s for _ in range(s)]
    for i, p in enumerate(patterns):
        for j, q in enumerate(patterns):
            compatible[i][j] = p[0] != q[0] and p[1] != q[1] and p[2] != q[2]

    dp = [1] * s
    for _ in range(n - 1):
        nxt = [0] * s
        for i in range(s):
            if dp[i] == 0:
                continue
            for j in range(s):
                if compatible[i][j]:
                    nxt[j] = (nxt[j] + dp[i]) % mod
        dp = nxt
    return sum(dp) % mod
