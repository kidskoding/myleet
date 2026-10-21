def shortest_superstring(words: list[str]) -> str:
    # Problem 54: Find the Shortest Superstring
    # Time: O(n^2 * 2^n + n^2 * L)
    # Space: O(n * 2^n)

    n = len(words)
    if n == 1:
        return words[0]

    overlap = [[0] * n for _ in range(n)]
    for i, a in enumerate(words):
        for j, b in enumerate(words):
            if i == j:
                continue
            best = 0
            for k in range(1, min(len(a), len(b)) + 1):
                if a[-k:] == b[:k]:
                    best = k
            overlap[i][j] = best

    full = 1 << n
    # dp[mask][i] = min length of superstring using words in mask ending at i
    dp = [[10**9] * n for _ in range(full)]
    parent = [[-1] * n for _ in range(full)]

    for i in range(n):
        dp[1 << i][i] = len(words[i])

    for mask in range(full):
        for i in range(n):
            if not (mask & (1 << i)):
                continue
            if dp[mask][i] >= 10**9:
                continue
            for j in range(n):
                if mask & (1 << j):
                    continue
                nxt = mask | (1 << j)
                cand = dp[mask][i] + len(words[j]) - overlap[i][j]
                if cand < dp[nxt][j]:
                    dp[nxt][j] = cand
                    parent[nxt][j] = i

    end = min(range(n), key=lambda i: dp[full - 1][i])
    order = []
    mask = full - 1
    cur = end
    while cur != -1:
        order.append(cur)
        prev = parent[mask][cur]
        mask ^= 1 << cur
        cur = prev
    order.reverse()

    parts = [words[order[0]]]
    for a, b in zip(order, order[1:]):
        parts.append(words[b][overlap[a][b] :])
    return "".join(parts)
