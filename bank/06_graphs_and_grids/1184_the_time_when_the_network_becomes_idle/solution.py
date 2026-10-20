from collections import deque


def network_becomes_idle(edges: list[list[int]], patience: list[int]) -> int:
    n = len(patience)
    graph: list[list[int]] = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    dist = [-1] * n
    dist[0] = 0
    queue = deque([0])
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                queue.append(v)
    idle = 0
    for i in range(1, n):
        trip = 2 * dist[i]
        last_send = (trip - 1) // patience[i] * patience[i]
        idle = max(idle, last_send + trip + 1)
    return idle
