def longest_path(parent: list[int], s: str) -> int:
    n = len(parent)
    children: list[list[int]] = [[] for _ in range(n)]
    for node in range(1, n):
        children[parent[node]].append(node)
    order = [0]
    for node in order:
        order.extend(children[node])
    down = [1] * n
    best = 1
    for node in reversed(order):
        first = second = 0
        for child in children[node]:
            if s[child] == s[node]:
                continue
            if down[child] > first:
                first, second = down[child], first
            elif down[child] > second:
                second = down[child]
        down[node] = 1 + first
        best = max(best, 1 + first + second)
    return best
