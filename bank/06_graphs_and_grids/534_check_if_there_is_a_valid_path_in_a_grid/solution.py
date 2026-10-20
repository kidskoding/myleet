from collections import deque

UP, DOWN, LEFT, RIGHT = (-1, 0), (1, 0), (0, -1), (0, 1)
OPENS = {
    1: (LEFT, RIGHT),
    2: (UP, DOWN),
    3: (LEFT, DOWN),
    4: (RIGHT, DOWN),
    5: (LEFT, UP),
    6: (RIGHT, UP),
}


def has_valid_path(grid: list[list[int]]) -> bool:
    rows, cols = len(grid), len(grid[0])
    seen = {(0, 0)}
    queue = deque([(0, 0)])
    while queue:
        r, c = queue.popleft()
        if (r, c) == (rows - 1, cols - 1):
            return True
        for dr, dc in OPENS[grid[r][c]]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and (-dr, -dc) in OPENS[grid[nr][nc]]:
                seen.add((nr, nc))
                queue.append((nr, nc))
    return False
