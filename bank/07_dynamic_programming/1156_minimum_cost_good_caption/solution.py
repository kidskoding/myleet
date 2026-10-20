def min_cost_good_caption(caption: str) -> str:
    n = len(caption)
    if n < 3:
        return ""
    s = [ord(c) - ord("a") for c in caption]
    inf = float("inf")
    cost = [[inf] * 26 for _ in range(n + 1)]
    nxt = [list(range(26)) for _ in range(n + 1)]
    best = [0] * (n + 1)
    for i in range(n - 3, -1, -1):
        for j in range(26):
            block = abs(s[i] - j) + abs(s[i + 1] - j) + abs(s[i + 2] - j)
            if i == n - 3:
                cost[i][j] = block
                continue
            extend = cost[i + 1][j] + abs(s[i] - j)
            if i <= n - 6:
                k = best[i + 3]
                split = cost[i + 3][k] + block
                if split < extend or (split == extend and k < j):
                    extend = split
                    nxt[i][j] = k
            cost[i][j] = extend
        row = cost[i]
        best[i] = row.index(min(row))
    out = []
    i, j = 0, best[0]
    while i < n:
        k = nxt[i][j]
        if k == j:
            out.append(chr(ord("a") + j))
            i += 1
        else:
            out.append(chr(ord("a") + j) * 3)
            i += 3
            j = k
    return "".join(out)
