class _UF:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n + 1))
        self.components = n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        self.parent[ra] = rb
        self.components -= 1
        return True


def max_num_edges_to_remove(n: int, edges: list[list[int]]) -> int:
    # Problem 44: Remove Max Number of Edges to Keep Graph Fully Traversable
    # Time: O(m * α(n))
    # Space: O(n)

    alice = _UF(n)
    bob = _UF(n)
    removed = 0

    for t, u, v in edges:
        if t == 3:
            used_a = alice.union(u, v)
            used_b = bob.union(u, v)
            if not used_a and not used_b:
                removed += 1

    for t, u, v in edges:
        if t == 1:
            if not alice.union(u, v):
                removed += 1
        elif t == 2:
            if not bob.union(u, v):
                removed += 1

    if alice.components > 1 or bob.components > 1:
        return -1
    return removed
