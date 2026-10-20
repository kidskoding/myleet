def min_time(n: int, edges: list[list[int]], has_apple: list[bool]) -> int:
    graph: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    parent = [-1] * n
    order = [0]
    seen = [False] * n
    seen[0] = True
    for u in order:
        for v in graph[u]:
            if not seen[v]:
                seen[v] = True
                parent[v] = u
                order.append(v)
    needed = list(has_apple)
    total = 0
    for u in reversed(order[1:]):
        if needed[u]:
            total += 2
            needed[parent[u]] = True
    return total
