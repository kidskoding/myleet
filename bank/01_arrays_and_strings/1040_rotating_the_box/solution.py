def rotate_the_box(box_grid: list[list[str]]) -> list[list[str]]:
    m, n = len(box_grid), len(box_grid[0])
    result = [["."] * m for _ in range(n)]
    for i, row in enumerate(box_grid):
        settled = row[:]
        empty = n - 1
        for j in range(n - 1, -1, -1):
            if settled[j] == "*":
                empty = j - 1
            elif settled[j] == "#":
                settled[j] = "."
                settled[empty] = "#"
                empty -= 1
        for j in range(n):
            result[j][m - 1 - i] = settled[j]
    return result
