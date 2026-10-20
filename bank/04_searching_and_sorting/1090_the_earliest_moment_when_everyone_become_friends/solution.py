def earliest_acq(logs: list[list[int]], n: int) -> int:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    groups = n
    for timestamp, x, y in sorted(logs):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry
            groups -= 1
            if groups == 1:
                return timestamp
    return -1
