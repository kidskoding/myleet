def longest_cycle(edges: list[int]) -> int:
    n = len(edges)
    visited_at = [0] * n
    clock = 1
    best = -1
    for start in range(n):
        if visited_at[start]:
            continue
        walk_start = clock
        node = start
        while node != -1 and not visited_at[node]:
            visited_at[node] = clock
            clock += 1
            node = edges[node]
        if node != -1 and visited_at[node] >= walk_start:
            best = max(best, clock - visited_at[node])
    return best
