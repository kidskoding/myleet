def max_width_of_vertical_area(points: list[list[int]]) -> int:
    xs = sorted(x for x, _ in points)
    return max(b - a for a, b in zip(xs, xs[1:]))
