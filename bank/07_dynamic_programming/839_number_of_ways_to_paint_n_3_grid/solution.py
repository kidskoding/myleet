MOD = 10**9 + 7


def num_of_ways(n: int) -> int:
    two_color, three_color = 6, 6
    for _ in range(n - 1):
        two_color, three_color = (
            (3 * two_color + 2 * three_color) % MOD,
            (2 * two_color + 2 * three_color) % MOD,
        )
    return (two_color + three_color) % MOD
