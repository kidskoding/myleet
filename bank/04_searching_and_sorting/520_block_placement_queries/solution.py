from bisect import bisect_right, insort


def get_results(queries: list[list[int]]) -> list[bool]:
    limit = max(q[1] for q in queries) + 1
    size = 1
    while size < limit:
        size *= 2
    tree = [0] * (2 * size)

    def update(i: int, value: int) -> None:
        i += size
        tree[i] = value
        i //= 2
        while i:
            tree[i] = max(tree[2 * i], tree[2 * i + 1])
            i //= 2

    def prefix_max(right: int) -> int:
        lo, hi = size, right + size + 1
        best = 0
        while lo < hi:
            if lo & 1:
                best = max(best, tree[lo])
                lo += 1
            if hi & 1:
                hi -= 1
                best = max(best, tree[hi])
            lo //= 2
            hi //= 2
        return best

    obstacles = [0]
    results = []
    for query in queries:
        x = query[1]
        if query[0] == 1:
            k = bisect_right(obstacles, x)
            prev = obstacles[k - 1]
            update(x, x - prev)
            if k < len(obstacles):
                nxt = obstacles[k]
                update(nxt, nxt - x)
            insort(obstacles, x)
        else:
            prev = obstacles[bisect_right(obstacles, x) - 1]
            results.append(max(prefix_max(prev), x - prev) >= query[2])
    return results
