def maximize_sum_of_weights(edges: list[list[int]], k: int) -> int:
    n = len(edges) + 1
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    parent = [-1] * n
    parent_weight = [0] * n
    order = [0]
    seen = [False] * n
    seen[0] = True
    for node in order:
        for nxt, w in adj[node]:
            if not seen[nxt]:
                seen[nxt] = True
                parent[nxt] = node
                parent_weight[nxt] = w
                order.append(nxt)
    free = [0] * n
    capped = [0] * n
    children_info: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for node in order[1:]:
        children_info[parent[node]].append((node, parent_weight[node]))
    for node in reversed(order):
        base = 0
        gains = []
        for child, w in children_info[node]:
            base += free[child]
            gain = capped[child] + w - free[child]
            if gain > 0:
                gains.append(gain)
        gains.sort(reverse=True)
        free[node] = base + sum(gains[:k])
        capped[node] = base + sum(gains[: k - 1])
    return free[0]
