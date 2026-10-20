def count_sub_trees(n: int, edges: list[list[int]], labels: str) -> list[int]:
    graph: list[list[int]] = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    parent = [-1] * n
    order: list[int] = []
    stack = [0]
    seen = [False] * n
    seen[0] = True
    while stack:
        node = stack.pop()
        order.append(node)
        for nxt in graph[node]:
            if not seen[nxt]:
                seen[nxt] = True
                parent[nxt] = node
                stack.append(nxt)
    counts = [[0] * 26 for _ in range(n)]
    answer = [0] * n
    for node in reversed(order):
        label = ord(labels[node]) - ord("a")
        counts[node][label] += 1
        answer[node] = counts[node][label]
        p = parent[node]
        if p != -1:
            for i in range(26):
                counts[p][i] += counts[node][i]
    return answer
