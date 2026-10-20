from collections import deque


def diameter(edges: list[list[int]]) -> int:
    n = len(edges) + 1
    graph: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)

    def farthest(src: int) -> tuple[int, int]:
        dist = [-1] * n
        dist[src] = 0
        queue = deque([src])
        node = src
        while queue:
            node = queue.popleft()
            for nxt in graph[node]:
                if dist[nxt] < 0:
                    dist[nxt] = dist[node] + 1
                    queue.append(nxt)
        return node, dist[node]

    end, _ = farthest(0)
    return farthest(end)[1]


def minimum_diameter_after_merge(edges1: list[list[int]], edges2: list[list[int]]) -> int:
    d1, d2 = diameter(edges1), diameter(edges2)
    return max(d1, d2, (d1 + 1) // 2 + (d2 + 1) // 2 + 1)
