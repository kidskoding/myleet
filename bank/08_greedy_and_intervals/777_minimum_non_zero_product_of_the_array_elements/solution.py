MOD = 10**9 + 7


def min_non_zero_product(p: int) -> int:
    top = (1 << p) - 1
    return top % MOD * pow((top - 1) % MOD, (1 << (p - 1)) - 1, MOD) % MOD
