MOD = 10**9 + 7


def monkey_move(n: int) -> int:
    return (pow(2, n, MOD) - 2) % MOD
