import heapq


class Graph:
    def __init__(self, n: int, edges: list[list[int]]) -> None:
        self.adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
        for edge in edges:
            self.add_edge(edge)

    def add_edge(self, edge: list[int]) -> None:
        u, v, cost = edge
        self.adj[u].append((v, cost))

    def shortest_path(self, node1: int, node2: int) -> int:
        dist = {node1: 0}
        heap = [(0, node1)]
        while heap:
            d, u = heapq.heappop(heap)
            if u == node2:
                return d
            if d > dist[u]:
                continue
            for v, cost in self.adj[u]:
                nd = d + cost
                if nd < dist.get(v, nd + 1):
                    dist[v] = nd
                    heapq.heappush(heap, (nd, v))
        return -1
