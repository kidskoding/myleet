from __future__ import annotations


def maximal_path_quality(values: list[int], edges: list[list[int]], max_time: int) -> int:
    # Problem 42: Maximum Path Quality of a Graph
    # Time: exponential in n with pruning
    # Space: O(n + m)

    n = len(values)
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for u, v, t in edges:
        graph[u].append((v, t))
        graph[v].append((u, t))

    best = 0
    seen = [0] * n

    def dfs(u: int, time_left: int, quality: int) -> None:
        nonlocal best
        if u == 0:
            best = max(best, quality)
        for v, t in graph[u]:
            if t > time_left:
                continue
            first = seen[v] == 0
            seen[v] += 1
            dfs(v, time_left - t, quality + (values[v] if first else 0))
            seen[v] -= 1

    seen[0] = 1
    dfs(0, max_time, values[0])
    return best
