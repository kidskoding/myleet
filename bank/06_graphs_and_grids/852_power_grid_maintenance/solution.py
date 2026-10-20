import heapq


def process_queries(c: int, connections: list[list[int]], queries: list[list[int]]) -> list[int]:
    parent = list(range(c + 1))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in connections:
        parent[find(u)] = find(v)
    heaps: dict[int, list[int]] = {}
    for station in range(1, c + 1):
        heaps.setdefault(find(station), []).append(station)
    online = [True] * (c + 1)
    result = []
    for kind, x in queries:
        if kind == 2:
            online[x] = False
            continue
        if online[x]:
            result.append(x)
            continue
        heap = heaps[find(x)]
        while heap and not online[heap[0]]:
            heapq.heappop(heap)
        result.append(heap[0] if heap else -1)
    return result
