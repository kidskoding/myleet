from math import comb


def distribute_candies(n: int, limit: int) -> int:
    total = 0
    for over in range(4):
        rest = n - over * (limit + 1)
        if rest < 0:
            break
        total += (-1) ** over * comb(3, over) * comb(rest + 2, 2)
    return total
