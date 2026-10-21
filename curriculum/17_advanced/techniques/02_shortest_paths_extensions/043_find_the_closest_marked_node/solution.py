from __future__ import annotations

import heapq


def minimum_distance(n: int, edges: list[list[int]], s: int, marked: list[int]) -> int:
    # Problem 43: Find the Closest Marked Node
    # Time: O((n + m) log n)
    # Space: O(n + m)

    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))

    dist = [10**18] * n
    dist[s] = 0
    heap: list[tuple[int, int]] = [(0, s)]
    while heap:
        d, u = heapq.heappop(heap)
        if d != dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))

    ans = min(dist[i] for i in marked)
    return -1 if ans >= 10**18 else ans
