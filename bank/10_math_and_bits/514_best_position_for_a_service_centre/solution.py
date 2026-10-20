from math import hypot


def get_min_dist_sum(positions: list[list[int]]) -> float:
    def cost(x: float, y: float) -> float:
        return sum(hypot(x - px, y - py) for px, py in positions)

    x = sum(p[0] for p in positions) / len(positions)
    y = sum(p[1] for p in positions) / len(positions)
    best = cost(x, y)
    step = 100.0
    while step > 1e-7:
        moved = False
        for dx, dy in ((step, 0), (-step, 0), (0, step), (0, -step)):
            candidate = cost(x + dx, y + dy)
            if candidate < best:
                best, x, y = candidate, x + dx, y + dy
                moved = True
                break
        if not moved:
            step /= 2
    return best
