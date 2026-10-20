from collections import defaultdict


def valid_arrangement(pairs: list[list[int]]) -> list[list[int]]:
    graph: dict[int, list[int]] = defaultdict(list)
    balance: dict[int, int] = defaultdict(int)
    for a, b in pairs:
        graph[a].append(b)
        balance[a] += 1
        balance[b] -= 1
    start = pairs[0][0]
    for node, diff in balance.items():
        if diff == 1:
            start = node
            break
    stack = [start]
    path: list[int] = []
    while stack:
        node = stack[-1]
        if graph[node]:
            stack.append(graph[node].pop())
        else:
            path.append(stack.pop())
    path.reverse()
    return [[path[i], path[i + 1]] for i in range(len(path) - 1)]
