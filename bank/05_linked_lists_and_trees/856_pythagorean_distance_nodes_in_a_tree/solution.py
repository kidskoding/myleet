from collections import deque


def special_nodes(n: int, edges: list[list[int]], x: int, y: int, z: int) -> int:
    graph: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)

    def distances(source: int) -> list[int]:
        dist = [-1] * n
        dist[source] = 0
        queue = deque([source])
        while queue:
            node = queue.popleft()
            for nxt in graph[node]:
                if dist[nxt] < 0:
                    dist[nxt] = dist[node] + 1
                    queue.append(nxt)
        return dist

    dx, dy, dz = distances(x), distances(y), distances(z)
    count = 0
    for u in range(n):
        a, b, c = sorted((dx[u], dy[u], dz[u]))
        if a * a + b * b == c * c:
            count += 1
    return count
