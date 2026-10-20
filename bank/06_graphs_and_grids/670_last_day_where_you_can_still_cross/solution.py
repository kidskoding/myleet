def latest_day_to_cross(row: int, col: int, cells: list[list[int]]) -> int:
    top, bottom = row * col, row * col + 1
    parent = list(range(row * col + 2))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    land = [[False] * col for _ in range(row)]
    for day in range(len(cells) - 1, -1, -1):
        r, c = cells[day][0] - 1, cells[day][1] - 1
        land[r][c] = True
        cell = r * col + c
        if r == 0:
            union(cell, top)
        if r == row - 1:
            union(cell, bottom)
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < row and 0 <= nc < col and land[nr][nc]:
                union(cell, nr * col + nc)
        if find(top) == find(bottom):
            return day
    return 0
