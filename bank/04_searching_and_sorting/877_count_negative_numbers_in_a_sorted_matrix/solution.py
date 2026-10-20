def count_negatives(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    r, c = rows - 1, 0
    count = 0
    while r >= 0 and c < cols:
        if grid[r][c] < 0:
            count += cols - c
            r -= 1
        else:
            c += 1
    return count
