def max_increase_keeping_skyline(grid: list[list[int]]) -> int:
    row_max = [max(row) for row in grid]
    col_max = [max(col) for col in zip(*grid)]
    return sum(min(row_max[r], col_max[c]) - height for r, row in enumerate(grid) for c, height in enumerate(row))
