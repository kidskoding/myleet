def robot_sim(commands: list[int], obstacles: list[list[int]]) -> int:
    # Time: O(total steps + obstacles).
    # Space: O(obstacles).
    blocked = {(x, y) for x, y in obstacles}
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    d = 0
    x = y = 0
    best = 0
    for cmd in commands:
        if cmd == -2:
            d = (d + 3) % 4
        elif cmd == -1:
            d = (d + 1) % 4
        else:
            dx, dy = dirs[d]
            for _ in range(cmd):
                if (x + dx, y + dy) in blocked:
                    break
                x += dx
                y += dy
                best = max(best, x * x + y * y)
    return best
