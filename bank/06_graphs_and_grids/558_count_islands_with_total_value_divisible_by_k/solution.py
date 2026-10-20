def count_islands(grid: list[list[int]], k: int) -> int:
    rows, cols = len(grid), len(grid[0])
    seen = [[False] * cols for _ in range(rows)]
    result = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 or seen[r][c]:
                continue
            seen[r][c] = True
            stack = [(r, c)]
            total = 0
            while stack:
                x, y = stack.pop()
                total += grid[x][y]
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] > 0 and not seen[nx][ny]:
                        seen[nx][ny] = True
                        stack.append((nx, ny))
            if total % k == 0:
                result += 1
    return result
