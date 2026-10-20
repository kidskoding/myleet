def is_possible(n: int, edges: list[list[int]]) -> bool:
    degree = [0] * (n + 1)
    adjacent: set[tuple[int, int]] = set()
    for a, b in edges:
        degree[a] += 1
        degree[b] += 1
        adjacent.add((a, b))
        adjacent.add((b, a))
    odd = [v for v in range(1, n + 1) if degree[v] % 2]

    def free(a: int, b: int) -> bool:
        return (a, b) not in adjacent

    if not odd:
        return True
    if len(odd) == 2:
        a, b = odd
        if free(a, b):
            return True
        return any(c != a and c != b and free(a, c) and free(b, c) for c in range(1, n + 1))
    if len(odd) == 4:
        a, b, c, d = odd
        return (free(a, b) and free(c, d)) or (free(a, c) and free(b, d)) or (free(a, d) and free(b, c))
    return False
