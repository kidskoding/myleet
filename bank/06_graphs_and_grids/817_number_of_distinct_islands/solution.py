def num_distinct_islands(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    seen = [[False] * cols for _ in range(rows)]
    shapes: set[tuple[tuple[int, int], ...]] = set()
    for r0 in range(rows):
        for c0 in range(cols):
            if grid[r0][c0] != 1 or seen[r0][c0]:
                continue
            seen[r0][c0] = True
            stack = [(r0, c0)]
            cells = []
            while stack:
                r, c = stack.pop()
                cells.append((r - r0, c - c0))
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1 and not seen[nr][nc]:
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            shapes.add(tuple(sorted(cells)))
    return len(shapes)
