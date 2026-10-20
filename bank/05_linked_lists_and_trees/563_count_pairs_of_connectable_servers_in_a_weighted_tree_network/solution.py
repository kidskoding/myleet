def count_pairs_of_connectable_servers(edges: list[list[int]], signal_speed: int) -> list[int]:
    n = len(edges) + 1
    graph: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for a, b, weight in edges:
        graph[a].append((b, weight))
        graph[b].append((a, weight))

    def good_in_branch(start: int, parent: int, dist: int) -> int:
        good = 0
        stack = [(start, parent, dist)]
        while stack:
            node, par, d = stack.pop()
            if d % signal_speed == 0:
                good += 1
            for nxt, weight in graph[node]:
                if nxt != par:
                    stack.append((nxt, node, d + weight))
        return good

    result = [0] * n
    for center in range(n):
        seen = 0
        for neighbor, weight in graph[center]:
            good = good_in_branch(neighbor, center, weight)
            result[center] += seen * good
            seen += good
    return result
