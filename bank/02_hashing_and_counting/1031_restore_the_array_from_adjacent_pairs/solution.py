from collections import defaultdict


def restore_array(adjacent_pairs: list[list[int]]) -> list[int]:
    graph: dict[int, list[int]] = defaultdict(list)
    for a, b in adjacent_pairs:
        graph[a].append(b)
        graph[b].append(a)
    start = next(x for x, nbrs in graph.items() if len(nbrs) == 1)
    result = [start]
    prev = None
    while len(result) < len(adjacent_pairs) + 1:
        cur = result[-1]
        nxt = next(x for x in graph[cur] if x != prev)
        prev = cur
        result.append(nxt)
    return result
