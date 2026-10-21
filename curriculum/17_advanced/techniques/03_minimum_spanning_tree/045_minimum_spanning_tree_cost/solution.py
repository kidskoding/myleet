def mst_cost(n: int, edges: list[list[int]]) -> int:
    # Problem 45: Minimum Spanning Tree Cost
    # Time: O(m log m)
    # Space: O(n)

    if n == 1:
        return 0

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = 0
    used = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        ru, rv = find(u), find(v)
        if ru == rv:
            continue
        parent[ru] = rv
        total += w
        used += 1
        if used == n - 1:
            return total
    return -1
