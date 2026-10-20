from itertools import product

MOD = 10**9 + 7


def color_the_grid(m: int, n: int) -> int:
    columns = [col for col in product(range(3), repeat=m) if all(col[i] != col[i + 1] for i in range(m - 1))]
    fits = [[j for j, b in enumerate(columns) if all(x != y for x, y in zip(a, b))] for a in columns]
    ways = [1] * len(columns)
    for _ in range(n - 1):
        nxt = [0] * len(columns)
        for i, count in enumerate(ways):
            for j in fits[i]:
                nxt[j] = (nxt[j] + count) % MOD
        ways = nxt
    return sum(ways) % MOD
