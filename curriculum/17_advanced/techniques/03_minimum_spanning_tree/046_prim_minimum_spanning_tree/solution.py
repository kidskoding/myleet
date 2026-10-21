from __future__ import annotations

import heapq


def prim_mst(n: int, adj: list[list[list[int]]]) -> int:
    # Problem 46: Prim Minimum Spanning Tree
    # Time: O((n + m) log n)
    # Space: O(n + m)

    if n == 1:
        return 0

    visited = [False] * n
    heap: list[tuple[int, int]] = [(0, 0)]
    total = 0
    taken = 0

    while heap and taken < n:
        w, u = heapq.heappop(heap)
        if visited[u]:
            continue
        visited[u] = True
        total += w
        taken += 1
        for v, vw in adj[u]:
            if not visited[v]:
                heapq.heappush(heap, (vw, v))

    return total if taken == n else -1
