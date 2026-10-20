from functools import cache


@cache
def _power(x: int) -> int:
    if x == 1:
        return 0
    return 1 + _power(x // 2 if x % 2 == 0 else 3 * x + 1)


def get_kth(lo: int, hi: int, k: int) -> int:
    return sorted(range(lo, hi + 1), key=lambda x: (_power(x), x))[k - 1]
