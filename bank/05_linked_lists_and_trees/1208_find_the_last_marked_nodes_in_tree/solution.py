from collections import deque


def last_marked_nodes(edges: list[list[int]]) -> list[int]:
    n = len(edges) + 1
    g: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)

    def bfs(start: int) -> list[int]:
        dist = [-1] * n
        dist[start] = 0
        q = deque([start])
        while q:
            u = q.popleft()
            for v in g[u]:
                if dist[v] < 0:
                    dist[v] = dist[u] + 1
                    q.append(v)
        return dist

    d0 = bfs(0)
    a = max(range(n), key=lambda i: d0[i])
    da = bfs(a)
    b = max(range(n), key=lambda i: da[i])
    db = bfs(b)
    return [a if da[i] >= db[i] else b for i in range(n)]
