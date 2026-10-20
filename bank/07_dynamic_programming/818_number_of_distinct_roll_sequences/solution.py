from math import gcd

MOD = 10**9 + 7


def distinct_sequences(n: int) -> int:
    if n == 1:
        return 6
    dp = [[0] * 7 for _ in range(7)]
    for a in range(1, 7):
        for b in range(1, 7):
            if a != b and gcd(a, b) == 1:
                dp[a][b] = 1
    for _ in range(n - 2):
        nxt = [[0] * 7 for _ in range(7)]
        for a in range(1, 7):
            for b in range(1, 7):
                if dp[a][b] == 0:
                    continue
                for c in range(1, 7):
                    if c != a and c != b and gcd(b, c) == 1:
                        nxt[b][c] = (nxt[b][c] + dp[a][b]) % MOD
        dp = nxt
    return sum(sum(row) for row in dp) % MOD
