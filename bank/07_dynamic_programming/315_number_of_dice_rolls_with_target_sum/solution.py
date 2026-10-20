MOD = 10**9 + 7


def num_rolls_to_target(n: int, k: int, target: int) -> int:
    ways = [0] * (target + 1)
    ways[0] = 1
    for _ in range(n):
        nxt = [0] * (target + 1)
        for total in range(1, target + 1):
            acc = 0
            for face in range(1, min(k, total) + 1):
                acc += ways[total - face]
            nxt[total] = acc % MOD
        ways = nxt
    return ways[target]
