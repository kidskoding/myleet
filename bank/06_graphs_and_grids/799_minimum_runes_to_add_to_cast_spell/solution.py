def min_runes_to_add(n: int, crystals: list[int], flow_from: list[int], flow_to: list[int]) -> int:
    graph: list[list[int]] = [[] for _ in range(n)]
    reverse: list[list[int]] = [[] for _ in range(n)]
    for u, v in zip(flow_from, flow_to):
        graph[u].append(v)
        reverse[v].append(u)

    reached = [False] * n
    stack = list(crystals)
    for c in crystals:
        reached[c] = True
    while stack:
        u = stack.pop()
        for v in graph[u]:
            if not reached[v]:
                reached[v] = True
                stack.append(v)

    order: list[int] = []
    visited = reached[:]
    for start in range(n):
        if visited[start]:
            continue
        visited[start] = True
        frames = [(start, 0)]
        while frames:
            u, i = frames[-1]
            if i < len(graph[u]):
                frames[-1] = (u, i + 1)
                v = graph[u][i]
                if not visited[v]:
                    visited[v] = True
                    frames.append((v, 0))
            else:
                frames.pop()
                order.append(u)

    comp = [-1] * n
    count = 0
    for start in reversed(order):
        if comp[start] != -1:
            continue
        comp[start] = count
        stack = [start]
        while stack:
            u = stack.pop()
            for v in reverse[u]:
                if not reached[v] and comp[v] == -1:
                    comp[v] = count
                    stack.append(v)
        count += 1

    has_incoming = [False] * count
    for u, v in zip(flow_from, flow_to):
        if not reached[u] and not reached[v] and comp[u] != comp[v]:
            has_incoming[comp[v]] = True
    return has_incoming.count(False)
