def minimum_operations(grid: list[list[int]]) -> int:
    ops = 0
    for c in range(len(grid[0])):
        prev = grid[0][c]
        for r in range(1, len(grid)):
            need = max(grid[r][c], prev + 1)
            ops += need - grid[r][c]
            prev = need
    return ops
