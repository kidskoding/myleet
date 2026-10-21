def minimum_area(grid: list[list[int]]) -> int:
    min_r = min_c = 10**9
    max_r = max_c = -1
    for i, row in enumerate(grid):
        for j, v in enumerate(row):
            if v == 1:
                min_r = min(min_r, i)
                max_r = max(max_r, i)
                min_c = min(min_c, j)
                max_c = max(max_c, j)
    return (max_r - min_r + 1) * (max_c - min_c + 1)
