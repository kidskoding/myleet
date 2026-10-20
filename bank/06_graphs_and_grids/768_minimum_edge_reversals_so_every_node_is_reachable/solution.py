def min_edge_reversals(n: int, edges: list[list[int]]) -> list[int]:
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append((v, 0))
        graph[v].append((u, 1))
    order = [0]
    parent = [-1] * n
    seen = [False] * n
    seen[0] = True
    base = 0
    for node in order:
        for nxt, reverse in graph[node]:
            if not seen[nxt]:
                seen[nxt] = True
                parent[nxt] = node
                base += reverse
                order.append(nxt)
    answer = [0] * n
    answer[0] = base
    for node in order[1:]:
        for nxt, reverse in graph[node]:
            if nxt == parent[node]:
                answer[node] = answer[nxt] + (1 if reverse else -1)
                break
    return answer
