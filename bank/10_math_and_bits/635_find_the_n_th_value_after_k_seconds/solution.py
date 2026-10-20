from math import comb

MOD = 10**9 + 7


def value_after_k_seconds(n: int, k: int) -> int:
    return comb(n + k - 1, k) % MOD
