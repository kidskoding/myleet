from collections import deque


def min_knight_moves(x: int, y: int) -> int:
    x, y = abs(x), abs(y)
    moves = ((1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2))
    seen = {(0, 0)}
    queue = deque([(0, 0, 0)])
    while queue:
        cx, cy, steps = queue.popleft()
        if (cx, cy) == (x, y):
            return steps
        for dx, dy in moves:
            nx, ny = cx + dx, cy + dy
            if nx < -2 or ny < -2 or nx > x + 2 or ny > y + 2 or (nx, ny) in seen:
                continue
            seen.add((nx, ny))
            queue.append((nx, ny, steps + 1))
    return -1
