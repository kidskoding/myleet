from collections import deque


def count_visited_nodes(edges: list[int]) -> list[int]:
    n = len(edges)
    indegree = [0] * n
    for target in edges:
        indegree[target] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    removed: list[int] = []
    while queue:
        node = queue.popleft()
        removed.append(node)
        nxt = edges[node]
        indegree[nxt] -= 1
        if indegree[nxt] == 0:
            queue.append(nxt)
    answer = [0] * n
    on_tail = [False] * n
    for node in removed:
        on_tail[node] = True
    for start in range(n):
        if on_tail[start] or answer[start]:
            continue
        cycle = [start]
        node = edges[start]
        while node != start:
            cycle.append(node)
            node = edges[node]
        for node in cycle:
            answer[node] = len(cycle)
    for node in reversed(removed):
        answer[node] = answer[edges[node]] + 1
    return answer
