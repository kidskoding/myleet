MOD = 10**9 + 7


def distance_sum(m: int, n: int, k: int) -> int:
    cells = m * n
    factorial = [1] * (cells + 1)
    for i in range(1, cells + 1):
        factorial[i] = factorial[i - 1] * i % MOD

    def choose(a: int, b: int) -> int:
        if b < 0 or b > a:
            return 0
        return factorial[a] * pow(factorial[b] * factorial[a - b] % MOD, MOD - 2, MOD) % MOD

    column_part = m * m * (n - 1) * n * (n + 1) // 6
    row_part = n * n * (m - 1) * m * (m + 1) // 6
    return (column_part + row_part) % MOD * choose(cells - 2, k - 2) % MOD
