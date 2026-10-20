MOD = 10**9 + 7


def _max_gap(length: int, cuts: list[int]) -> int:
    points = [0, *sorted(cuts), length]
    return max(b - a for a, b in zip(points, points[1:]))


def max_area(h: int, w: int, horizontal_cuts: list[int], vertical_cuts: list[int]) -> int:
    return _max_gap(h, horizontal_cuts) * _max_gap(w, vertical_cuts) % MOD
