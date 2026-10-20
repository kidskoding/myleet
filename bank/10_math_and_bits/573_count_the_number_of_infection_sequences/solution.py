MOD = 10**9 + 7


def number_of_sequence(n: int, sick: list[int]) -> int:
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % MOD
    healthy = n - len(sick)
    ways = fact[healthy]
    gaps = [sick[0], n - 1 - sick[-1]]
    for a, b in zip(sick, sick[1:]):
        g = b - a - 1
        gaps.append(g)
        if g > 0:
            ways = ways * pow(2, g - 1, MOD) % MOD
    for g in gaps:
        ways = ways * pow(fact[g], MOD - 2, MOD) % MOD
    return ways
