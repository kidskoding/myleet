from functools import cache


def is_scramble(s1: str, s2: str) -> bool:
    @cache
    def go(a: str, b: str) -> bool:
        if a == b:
            return True
        if sorted(a) != sorted(b):
            return False
        n = len(a)
        for i in range(1, n):
            if go(a[:i], b[:i]) and go(a[i:], b[i:]):
                return True
            if go(a[:i], b[n - i :]) and go(a[i:], b[: n - i]):
                return True
        return False

    return go(s1, s2)
