def max_star_sum(vals: list[int], edges: list[list[int]], k: int) -> int:
    neighbors: list[list[int]] = [[] for _ in vals]
    for a, b in edges:
        if vals[b] > 0:
            neighbors[a].append(vals[b])
        if vals[a] > 0:
            neighbors[b].append(vals[a])
    best = float("-inf")
    for center, values in enumerate(neighbors):
        values.sort(reverse=True)
        best = max(best, vals[center] + sum(values[:k]))
    return best
