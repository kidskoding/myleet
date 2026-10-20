def max_area(coords: list[list[int]]) -> int:
    min_x = min(x for x, _ in coords)
    max_x = max(x for x, _ in coords)
    min_y = min(y for _, y in coords)
    max_y = max(y for _, y in coords)
    span_at_x: dict[int, tuple[int, int]] = {}
    span_at_y: dict[int, tuple[int, int]] = {}
    for x, y in coords:
        lo, hi = span_at_x.get(x, (y, y))
        span_at_x[x] = (min(lo, y), max(hi, y))
        lo, hi = span_at_y.get(y, (x, x))
        span_at_y[y] = (min(lo, x), max(hi, x))

    best = 0
    for x, (lo, hi) in span_at_x.items():
        best = max(best, (hi - lo) * max(x - min_x, max_x - x))
    for y, (lo, hi) in span_at_y.items():
        best = max(best, (hi - lo) * max(y - min_y, max_y - y))
    return best if best > 0 else -1
