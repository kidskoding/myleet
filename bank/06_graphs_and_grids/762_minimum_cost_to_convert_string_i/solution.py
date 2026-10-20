def minimum_cost(source: str, target: str, original: list[str], changed: list[str], cost: list[int]) -> int:
    inf = float("inf")
    dist = [[0 if i == j else inf for j in range(26)] for i in range(26)]
    for a, b, c in zip(original, changed, cost):
        i, j = ord(a) - 97, ord(b) - 97
        dist[i][j] = min(dist[i][j], c)
    for mid in range(26):
        for i in range(26):
            through = dist[i][mid]
            if through == inf:
                continue
            row = dist[i]
            for j in range(26):
                if through + dist[mid][j] < row[j]:
                    row[j] = through + dist[mid][j]
    total = 0
    for s, t in zip(source, target):
        step = dist[ord(s) - 97][ord(t) - 97]
        if step == inf:
            return -1
        total += step
    return int(total)
