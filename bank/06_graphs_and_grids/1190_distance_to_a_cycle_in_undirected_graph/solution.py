from collections import defaultdict, deque


def distance_to_cycle(n: int, edges: list[list[int]]) -> list[int]:
    g: dict[int, set[int]] = defaultdict(set)
    for a, b in edges:
        g[a].add(b)
        g[b].add(a)
    q = deque(i for i in range(n) if len(g[i]) == 1)
    parent = [0] * n
    seq: list[int] = []
    while q:
        i = q.popleft()
        seq.append(i)
        for j in list(g[i]):
            g[j].remove(i)
            parent[i] = j
            if len(g[j]) == 1:
                q.append(j)
        g[i].clear()
    ans = [0] * n
    for i in reversed(seq):
        ans[i] = ans[parent[i]] + 1
    return ans
