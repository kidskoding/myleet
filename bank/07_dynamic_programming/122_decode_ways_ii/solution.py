MOD = 10**9 + 7


def _one(c: str) -> int:
    if c == "*":
        return 9
    return 0 if c == "0" else 1


def _two(a: str, b: str) -> int:
    if a == "*" and b == "*":
        return 15
    if a == "*":
        return 2 if b <= "6" else 1
    if b == "*":
        return 9 if a == "1" else 6 if a == "2" else 0
    return 1 if 10 <= int(a + b) <= 26 else 0


def num_decodings(s: str) -> int:
    prev2, prev1 = 1, _one(s[0])
    for i in range(1, len(s)):
        cur = (prev1 * _one(s[i]) + prev2 * _two(s[i - 1], s[i])) % MOD
        prev2, prev1 = prev1, cur
    return prev1
