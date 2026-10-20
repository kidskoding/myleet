def min_moves_to_capture_the_queen(a: int, b: int, c: int, d: int, e: int, f: int) -> int:
    def strictly_between(x: int, lo: int, hi: int) -> bool:
        return min(lo, hi) < x < max(lo, hi)

    if a == e and not (c == a and strictly_between(d, b, f)):
        return 1
    if b == f and not (d == b and strictly_between(c, a, e)):
        return 1
    if c - d == e - f and not (a - b == c - d and strictly_between(a, c, e)):
        return 1
    if c + d == e + f and not (a + b == c + d and strictly_between(a, c, e)):
        return 1
    return 2
