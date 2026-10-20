def is_robot_bounded(instructions: str) -> bool:
    # Time: O(n), one pass over the instructions.
    # Space: O(1).
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    x = y = 0
    d = 0
    for ch in instructions:
        if ch == "G":
            x += dirs[d][0]
            y += dirs[d][1]
        elif ch == "L":
            d = (d + 3) % 4
        else:
            d = (d + 1) % 4
    return (x == 0 and y == 0) or d != 0
