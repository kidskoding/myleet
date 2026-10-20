MOD = 10**9 + 7


def make_string_sorted(s: str) -> int:
    n = len(s)
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % MOD
    inv_fact = [1] * (n + 1)
    inv_fact[n] = pow(fact[n], MOD - 2, MOD)
    for i in range(n, 0, -1):
        inv_fact[i - 1] = inv_fact[i] * i % MOD
    counts = [0] * 26
    for ch in s:
        counts[ord(ch) - 97] += 1
    total = 0
    for i, ch in enumerate(s):
        c = ord(ch) - 97
        rest = n - i - 1
        denom = 1
        for k in range(26):
            denom = denom * inv_fact[counts[k]] % MOD
        smaller = sum(counts[:c])
        if smaller:
            total = (total + smaller * fact[rest] % MOD * denom) % MOD
        counts[c] -= 1
    return total
