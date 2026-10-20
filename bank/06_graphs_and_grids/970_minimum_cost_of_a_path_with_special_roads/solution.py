import heapq


def minimum_cost(start: list[int], target: list[int], special_roads: list[list[int]]) -> int:
    tx, ty = target
    src = (start[0], start[1])
    dist = {src: 0}
    heap = [(0, src)]
    best = abs(tx - src[0]) + abs(ty - src[1])
    while heap:
        d, (x, y) = heapq.heappop(heap)
        if d > dist[(x, y)]:
            continue
        best = min(best, d + abs(tx - x) + abs(ty - y))
        for x1, y1, x2, y2, cost in special_roads:
            nd = d + abs(x1 - x) + abs(y1 - y) + cost
            if nd < dist.get((x2, y2), float("inf")):
                dist[(x2, y2)] = nd
                heapq.heappush(heap, (nd, (x2, y2)))
    return best
