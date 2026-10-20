def most_profitable_path(edges: list[list[int]], bob: int, amount: list[int]) -> int:
    n = len(amount)
    graph: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    parent = [-1] * n
    depth = [0] * n
    order = [0]
    seen = [False] * n
    seen[0] = True
    for u in order:
        for v in graph[u]:
            if not seen[v]:
                seen[v] = True
                parent[v] = u
                depth[v] = depth[u] + 1
                order.append(v)
    bob_time = [n + 1] * n
    node, t = bob, 0
    while node != -1:
        bob_time[node] = t
        node = parent[node]
        t += 1
    gain = [0] * n
    best = None
    for u in order:
        if depth[u] < bob_time[u]:
            share = amount[u]
        elif depth[u] == bob_time[u]:
            share = amount[u] // 2
        else:
            share = 0
        gain[u] = share + (gain[parent[u]] if u else 0)
        if u and len(graph[u]) == 1 and (best is None or gain[u] > best):
            best = gain[u]
    return gain[0] if best is None else best
