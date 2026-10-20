def maximum_importance(n: int, roads: list[list[int]]) -> int:
    degree = [0] * n
    for a, b in roads:
        degree[a] += 1
        degree[b] += 1
    return sum(value * d for value, d in enumerate(sorted(degree), start=1))
