from __future__ import annotations

import heapq
from functools import lru_cache


def count_restricted_paths(n: int, edges: list[list[int]]) -> int:
    # Problem 41: Number of Restricted Paths From First to Last Node
    # Time: O((n + m) log n)
    # Space: O(n + m)

    mod = 10**9 + 7
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n + 1)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))

    dist = [10**18] * (n + 1)
    dist[n] = 0
    heap: list[tuple[int, int]] = [(0, n)]
    while heap:
        d, u = heapq.heappop(heap)
        if d != dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))

    @lru_cache(None)
    def dfs(u: int) -> int:
        if u == n:
            return 1
        total = 0
        for v, _ in graph[u]:
            if dist[u] > dist[v]:
                total = (total + dfs(v)) % mod
        return total

    return dfs(1)
