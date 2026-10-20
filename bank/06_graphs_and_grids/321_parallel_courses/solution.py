from collections import deque


def minimum_semesters(n: int, relations: list[list[int]]) -> int:
    graph: list[list[int]] = [[] for _ in range(n + 1)]
    indegree = [0] * (n + 1)
    for before, after in relations:
        graph[before].append(after)
        indegree[after] += 1
    queue = deque(c for c in range(1, n + 1) if indegree[c] == 0)
    taken = 0
    semesters = 0
    while queue:
        semesters += 1
        for _ in range(len(queue)):
            course = queue.popleft()
            taken += 1
            for nxt in graph[course]:
                indegree[nxt] -= 1
                if indegree[nxt] == 0:
                    queue.append(nxt)
    return semesters if taken == n else -1
