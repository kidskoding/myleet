def maximum_detonation(bombs: list[list[int]]) -> int:
    n = len(bombs)
    graph: list[list[int]] = [[] for _ in range(n)]
    for i, (xi, yi, ri) in enumerate(bombs):
        for j, (xj, yj, _) in enumerate(bombs):
            if i != j and (xi - xj) ** 2 + (yi - yj) ** 2 <= ri * ri:
                graph[i].append(j)

    best = 0
    for start in range(n):
        seen = {start}
        stack = [start]
        while stack:
            for nxt in graph[stack.pop()]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        best = max(best, len(seen))
    return best
