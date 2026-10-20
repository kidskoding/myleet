from math import isqrt


def kth_factor(n: int, k: int) -> int:
    root = isqrt(n)
    small = [i for i in range(1, root + 1) if n % i == 0]
    if k <= len(small):
        return small[k - 1]
    large = [n // i for i in reversed(small) if n // i != i]
    k -= len(small)
    return large[k - 1] if k <= len(large) else -1
