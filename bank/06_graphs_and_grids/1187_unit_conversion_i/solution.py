def base_unit_conversions(conversions: list[list[int]]) -> list[int]:
    mod = 10**9 + 7
    n = len(conversions) + 1
    children: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for src, dst, factor in conversions:
        children[src].append((dst, factor))
    result = [0] * n
    result[0] = 1
    stack = [0]
    while stack:
        u = stack.pop()
        for v, factor in children[u]:
            result[v] = result[u] * factor % mod
            stack.append(v)
    return result
