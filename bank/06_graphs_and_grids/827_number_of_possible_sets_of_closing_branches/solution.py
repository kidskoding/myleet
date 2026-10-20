def number_of_sets(n: int, max_distance: int, roads: list[list[int]]) -> int:
    inf = float("inf")
    result = 0
    for mask in range(1 << n):
        dist = [[0 if i == j else inf for j in range(n)] for i in range(n)]
        for u, v, w in roads:
            if mask >> u & 1 and mask >> v & 1 and w < dist[u][v]:
                dist[u][v] = dist[v][u] = w
        kept = [i for i in range(n) if mask >> i & 1]
        for k in kept:
            for i in kept:
                for j in kept:
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
        if all(dist[i][j] <= max_distance for i in kept for j in kept):
            result += 1
    return result
