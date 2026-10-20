MOD = 10**9 + 7


def number_of_stable_arrays(zero: int, one: int, limit: int) -> int:
    end0 = [[0] * (one + 1) for _ in range(zero + 1)]
    end1 = [[0] * (one + 1) for _ in range(zero + 1)]
    for i in range(1, min(zero, limit) + 1):
        end0[i][0] = 1
    for j in range(1, min(one, limit) + 1):
        end1[0][j] = 1
    for i in range(1, zero + 1):
        for j in range(1, one + 1):
            value = end0[i - 1][j] + end1[i - 1][j]
            if i > limit:
                value -= end1[i - limit - 1][j]
            end0[i][j] = value % MOD
            value = end0[i][j - 1] + end1[i][j - 1]
            if j > limit:
                value -= end0[i][j - limit - 1]
            end1[i][j] = value % MOD
    return (end0[zero][one] + end1[zero][one]) % MOD
