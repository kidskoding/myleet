from collections import defaultdict


def check_ways(pairs: list[list[int]]) -> int:
    adj: dict[int, set[int]] = defaultdict(set)
    for x, y in pairs:
        adj[x].add(y)
        adj[y].add(x)
    nodes = list(adj)
    n = len(nodes)
    root = max(nodes, key=lambda v: len(adj[v]))
    if len(adj[root]) != n - 1:
        return 0
    ways = 1
    for node in nodes:
        if node == root:
            continue
        degree = len(adj[node])
        parent = None
        parent_degree = n
        for nb in adj[node]:
            nb_degree = len(adj[nb])
            if degree <= nb_degree < parent_degree:
                parent = nb
                parent_degree = nb_degree
        if parent is None:
            return 0
        for nb in adj[node]:
            if nb != parent and nb not in adj[parent]:
                return 0
        if parent_degree == degree:
            ways = 2
    return ways
