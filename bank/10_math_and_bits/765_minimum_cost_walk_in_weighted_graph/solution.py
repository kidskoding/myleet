def minimum_cost(n: int, edges: list[list[int]], query: list[list[int]]) -> list[int]:
    parent = list(range(n))
    mask = [-1] * n

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v, w in edges:
        a, b = find(u), find(v)
        if a != b:
            parent[a] = b
            mask[b] &= mask[a]
        mask[b] &= w
    answer = []
    for s, t in query:
        a, b = find(s), find(t)
        answer.append(mask[a] if a == b else -1)
    return answer
