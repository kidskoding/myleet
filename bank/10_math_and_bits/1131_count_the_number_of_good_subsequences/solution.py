from collections import Counter

MOD = 10**9 + 7


def count_good_subsequences(s: str) -> int:
    n = len(s)
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % MOD
    inv_fact = [1] * (n + 1)
    inv_fact[n] = pow(fact[n], MOD - 2, MOD)
    for i in range(n, 0, -1):
        inv_fact[i - 1] = inv_fact[i] * i % MOD

    def choose(a: int, b: int) -> int:
        return fact[a] * inv_fact[b] % MOD * inv_fact[a - b] % MOD

    counts = list(Counter(s).values())
    total = 0
    for f in range(1, max(counts) + 1):
        ways = 1
        for c in counts:
            if c >= f:
                ways = ways * (1 + choose(c, f)) % MOD
        total = (total + ways - 1) % MOD
    return total
