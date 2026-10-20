from collections import deque


def maximum_invitations(favorite: list[int]) -> int:
    n = len(favorite)
    indegree = [0] * n
    for f in favorite:
        indegree[f] += 1
    depth = [1] * n
    queue = deque(i for i in range(n) if indegree[i] == 0)
    while queue:
        node = queue.popleft()
        nxt = favorite[node]
        depth[nxt] = max(depth[nxt], depth[node] + 1)
        indegree[nxt] -= 1
        if indegree[nxt] == 0:
            queue.append(nxt)

    longest_cycle = 0
    pair_total = 0
    for start in range(n):
        if indegree[start] == 0:
            continue
        length = 0
        node = start
        while indegree[node]:
            indegree[node] = 0
            length += 1
            node = favorite[node]
        if length == 2:
            pair_total += depth[start] + depth[favorite[start]]
        else:
            longest_cycle = max(longest_cycle, length)
    return max(longest_cycle, pair_total)
