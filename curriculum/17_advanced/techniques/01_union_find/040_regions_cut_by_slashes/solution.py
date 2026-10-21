def regions_by_slashes(grid: list[str]) -> int:
    # Problem 40: Regions Cut By Slashes
    # Time: O(n^2 * α(n^2))
    # Space: O(n^2)

    n = len(grid)
    parent = list(range(4 * n * n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for r in range(n):
        for c in range(n):
            root = 4 * (r * n + c)
            north, east, south, west = root, root + 1, root + 2, root + 3
            ch = grid[r][c]
            if ch == " ":
                union(north, east)
                union(east, south)
                union(south, west)
            elif ch == "/":
                union(north, west)
                union(east, south)
            else:  # "\\"
                union(north, east)
                union(south, west)

            if r + 1 < n:
                union(south, 4 * ((r + 1) * n + c))  # south with next north
            if c + 1 < n:
                union(east, 4 * (r * n + c + 1) + 3)  # east with next west

    return sum(find(i) == i for i in range(4 * n * n))
