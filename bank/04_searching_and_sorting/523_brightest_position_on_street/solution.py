from collections import defaultdict


def brightest_position(lights: list[list[int]]) -> int:
    delta: dict[int, int] = defaultdict(int)
    for position, reach in lights:
        delta[position - reach] += 1
        delta[position + reach + 1] -= 1
    best_point = 0
    best = 0
    current = 0
    for point in sorted(delta):
        current += delta[point]
        if current > best:
            best, best_point = current, point
    return best_point
