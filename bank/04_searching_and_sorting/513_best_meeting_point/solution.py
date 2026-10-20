def min_total_distance(grid: list[list[int]]) -> int:
    rows = [r for r, row in enumerate(grid) for cell in row if cell]
    cols = [c for c in range(len(grid[0])) for r in range(len(grid)) if grid[r][c]]

    def spread(points: list[int]) -> int:
        i, j = 0, len(points) - 1
        total = 0
        while i < j:
            total += points[j] - points[i]
            i += 1
            j -= 1
        return total

    return spread(rows) + spread(cols)
