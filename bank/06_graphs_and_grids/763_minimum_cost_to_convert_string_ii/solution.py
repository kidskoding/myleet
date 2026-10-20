def minimum_cost(source: str, target: str, original: list[str], changed: list[str], cost: list[int]) -> int:
    inf = float("inf")
    ids: dict[str, int] = {}
    for word in original + changed:
        ids.setdefault(word, len(ids))
    m = len(ids)
    dist = [[0 if i == j else inf for j in range(m)] for i in range(m)]
    for a, b, c in zip(original, changed, cost):
        i, j = ids[a], ids[b]
        dist[i][j] = min(dist[i][j], c)
    for mid in range(m):
        for i in range(m):
            through = dist[i][mid]
            if through == inf:
                continue
            row = dist[i]
            for j in range(m):
                if through + dist[mid][j] < row[j]:
                    row[j] = through + dist[mid][j]

    lengths = sorted({len(word) for word in original})
    n = len(source)
    dp = [inf] * (n + 1)
    dp[0] = 0
    for i in range(n):
        if dp[i] == inf:
            continue
        if source[i] == target[i]:
            dp[i + 1] = min(dp[i + 1], dp[i])
        for length in lengths:
            if i + length > n:
                break
            a = ids.get(source[i : i + length])
            b = ids.get(target[i : i + length])
            if a is not None and b is not None and dist[a][b] < inf:
                dp[i + length] = min(dp[i + length], dp[i] + dist[a][b])
    return int(dp[n]) if dp[n] < inf else -1
