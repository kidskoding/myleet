from collections import Counter
from math import gcd


def count_trapezoids(points: list[list[int]]) -> int:
    by_slope: Counter[tuple[int, int]] = Counter()
    by_line: Counter[tuple[int, int, int]] = Counter()
    by_mid: Counter[tuple[int, int]] = Counter()
    by_mid_slope: Counter[tuple[int, int, int, int]] = Counter()
    for i, (x1, y1) in enumerate(points):
        for x2, y2 in points[i + 1 :]:
            dx, dy = x2 - x1, y2 - y1
            g = gcd(dx, dy)
            dx, dy = dx // g, dy // g
            if dx < 0 or (dx == 0 and dy < 0):
                dx, dy = -dx, -dy
            slope = (dx, dy)
            by_slope[slope] += 1
            by_line[(dx, dy, dy * x1 - dx * y1)] += 1
            mid = (x1 + x2, y1 + y2)
            by_mid[mid] += 1
            by_mid_slope[(*mid, dx, dy)] += 1

    def pairs(counter: Counter) -> int:
        return sum(c * (c - 1) // 2 for c in counter.values())

    parallel_pairs = pairs(by_slope) - pairs(by_line)
    parallelograms = pairs(by_mid) - pairs(by_mid_slope)
    return parallel_pairs - parallelograms
