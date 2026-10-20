import heapq


def min_cost(n: int, edges: list[list[int]]) -> int:
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, 2 * w))
    dist = [float("inf")] * n
    dist[0] = 0
    heap = [(0, 0)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist[node]:
            continue
        if node == n - 1:
            return d
        for nxt, w in graph[node]:
            if d + w < dist[nxt]:
                dist[nxt] = d + w
                heapq.heappush(heap, (d + w, nxt))
    return -1
