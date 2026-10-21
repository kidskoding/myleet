def remove_stones(stones: list[list[int]]) -> int:
    # Problem 39: Most Stones Removed with Same Row or Column
    # Time: O(n * α(n))
    # Space: O(n)

    parent: dict[int, int] = {}

    def find(x: int) -> int:
        parent.setdefault(x, x)
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for x, y in stones:
        # Offset columns so row and column keys never collide.
        union(x, ~y)

    roots = {find(x) for x, _ in stones}
    return len(stones) - len(roots)
