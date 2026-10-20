def color_border(grid: list[list[int]], row: int, col: int, color: int) -> list[list[int]]:
    rows, cols = len(grid), len(grid[0])
    original = grid[row][col]
    component = {(row, col)}
    stack = [(row, col)]
    while stack:
        r, c = stack.pop()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in component and grid[nr][nc] == original:
                component.add((nr, nc))
                stack.append((nr, nc))
    border = [
        (r, c)
        for r, c in component
        if any((nr, nc) not in component for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)))
    ]
    for r, c in border:
        grid[r][c] = color
    return grid
