MOD = 10**9 + 7
MOVES = [[4, 6], [6, 8], [7, 9], [4, 8], [0, 3, 9], [], [0, 1, 7], [2, 6], [1, 3], [2, 4]]


def knight_dialer(n: int) -> int:
    ways = [1] * 10
    for _ in range(n - 1):
        nxt = [0] * 10
        for digit, count in enumerate(ways):
            for target in MOVES[digit]:
                nxt[target] = (nxt[target] + count) % MOD
        ways = nxt
    return sum(ways) % MOD
