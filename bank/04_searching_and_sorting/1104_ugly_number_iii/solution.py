from math import lcm


def nth_ugly_number(n: int, a: int, b: int, c: int) -> int:
    ab, ac, bc, abc = lcm(a, b), lcm(a, c), lcm(b, c), lcm(a, b, c)

    def count(x: int) -> int:
        return x // a + x // b + x // c - x // ab - x // ac - x // bc + x // abc

    lo, hi = 1, 2 * 10**9
    while lo < hi:
        mid = (lo + hi) // 2
        if count(mid) >= n:
            hi = mid
        else:
            lo = mid + 1
    return lo
