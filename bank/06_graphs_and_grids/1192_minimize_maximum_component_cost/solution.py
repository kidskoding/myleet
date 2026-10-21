def min_cost(n: int, edges: list[list[int]], k: int) -> int:
    if k >= n:
        return 0
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    edges = sorted(edges, key=lambda e: e[2])
    cnt = n
    for u, v, w in edges:
        pu, pv = find(u), find(v)
        if pu != pv:
            parent[pu] = pv
            cnt -= 1
            if cnt <= k:
                return w
    return 0
