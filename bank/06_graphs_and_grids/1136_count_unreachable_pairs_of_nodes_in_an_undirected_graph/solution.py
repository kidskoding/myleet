def count_pairs(n: int, edges: list[list[int]]) -> int:
    parent = list(range(n))
    size = [1] * n

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            if size[ra] < size[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            size[ra] += size[rb]

    total = 0
    seen = 0
    for node in range(n):
        if find(node) == node:
            total += size[node] * seen
            seen += size[node]
    return total
