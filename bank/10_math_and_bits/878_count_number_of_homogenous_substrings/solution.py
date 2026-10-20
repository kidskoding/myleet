MOD = 10**9 + 7


def count_homogenous(s: str) -> int:
    total = 0
    run = 0
    for i, ch in enumerate(s):
        run = run + 1 if i > 0 and ch == s[i - 1] else 1
        total += run
    return total % MOD
