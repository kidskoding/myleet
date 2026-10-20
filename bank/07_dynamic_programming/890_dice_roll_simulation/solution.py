MOD = 10**9 + 7


def die_simulator(n: int, roll_max: list[int]) -> int:
    ends = [[0] * (limit + 1) for limit in roll_max]
    for face in range(6):
        ends[face][1] = 1
    for _ in range(n - 1):
        total = sum(sum(row) for row in ends) % MOD
        nxt = [[0] * (limit + 1) for limit in roll_max]
        for face, limit in enumerate(roll_max):
            nxt[face][1] = (total - sum(ends[face])) % MOD
            for run in range(2, limit + 1):
                nxt[face][run] = ends[face][run - 1]
        ends = nxt
    return sum(sum(row) for row in ends) % MOD
