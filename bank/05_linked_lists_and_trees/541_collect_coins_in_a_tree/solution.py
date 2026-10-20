from collections import deque


def collect_the_coins(coins: list[int], edges: list[list[int]]) -> int:
    n = len(coins)
    graph: list[set[int]] = [set() for _ in range(n)]
    for a, b in edges:
        graph[a].add(b)
        graph[b].add(a)
    alive = n

    def remove(v: int) -> int | None:
        nonlocal alive
        alive -= 1
        if not graph[v]:
            return None
        u = graph[v].pop()
        graph[u].discard(v)
        return u

    queue = deque(v for v in range(n) if len(graph[v]) == 1 and not coins[v])
    while queue:
        v = queue.popleft()
        if len(graph[v]) != 1:
            continue
        u = remove(v)
        if u is not None and len(graph[u]) == 1 and not coins[u]:
            queue.append(u)

    for _ in range(2):
        leaves = [v for v in range(n) if len(graph[v]) == 1]
        for v in leaves:
            if len(graph[v]) == 1:
                remove(v)

    remaining_edges = sum(len(adj) for adj in graph) // 2
    return 2 * remaining_edges
