def count_highest_score_nodes(parents: list[int]) -> int:
    n = len(parents)
    children: list[list[int]] = [[] for _ in range(n)]
    for child in range(1, n):
        children[parents[child]].append(child)
    order = [0]
    for node in order:
        order.extend(children[node])
    size = [1] * n
    for node in reversed(order):
        if node:
            size[parents[node]] += size[node]
    best = 0
    count = 0
    for node in range(n):
        score = max(1, n - size[node])
        for child in children[node]:
            score *= size[child]
        if score > best:
            best, count = score, 1
        elif score == best:
            count += 1
    return count
