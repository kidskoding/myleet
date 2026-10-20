def largest_1_bordered_square(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    left = [[0] * (cols + 1) for _ in range(rows + 1)]
    up = [[0] * (cols + 1) for _ in range(rows + 1)]
    best = 0
    for r in range(1, rows + 1):
        for c in range(1, cols + 1):
            if grid[r - 1][c - 1] == 0:
                continue
            left[r][c] = left[r][c - 1] + 1
            up[r][c] = up[r - 1][c] + 1
            size = min(left[r][c], up[r][c])
            while size > best:
                if up[r][c - size + 1] >= size and left[r - size + 1][c] >= size:
                    best = size
                    break
                size -= 1
    return best * best
