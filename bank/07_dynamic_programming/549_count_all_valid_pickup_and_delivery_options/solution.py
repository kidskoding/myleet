MOD = 10**9 + 7


def count_orders(n: int) -> int:
    ways = 1
    for i in range(1, n + 1):
        ways = ways * i * (2 * i - 1) % MOD
    return ways
