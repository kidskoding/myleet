def maximum_subtree_size(edges: list[list[int]], colors: list[int]) -> int:
    n = len(colors)
    adj: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    parent = [-1] * n
    order = []
    seen = [False] * n
    seen[0] = True
    stack = [0]
    while stack:
        node = stack.pop()
        order.append(node)
        for nxt in adj[node]:
            if not seen[nxt]:
                seen[nxt] = True
                parent[nxt] = node
                stack.append(nxt)
    size = [1] * n
    uniform = [True] * n
    best = 0
    for node in reversed(order):
        if uniform[node]:
            best = max(best, size[node])
        p = parent[node]
        if p >= 0:
            size[p] += size[node]
            if not uniform[node] or colors[node] != colors[p]:
                uniform[p] = False
    return best
