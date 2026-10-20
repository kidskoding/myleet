from collections import Counter
from math import isqrt


def num_squareful_perms(nums: list[int]) -> int:
    count = Counter(nums)
    values = list(count)
    neighbours = {x: [y for y in values if isqrt(x + y) ** 2 == x + y] for x in values}

    def extend(last: int, remaining: int) -> int:
        if remaining == 0:
            return 1
        ways = 0
        for y in neighbours[last]:
            if count[y]:
                count[y] -= 1
                ways += extend(y, remaining - 1)
                count[y] += 1
        return ways

    total = 0
    for x in values:
        count[x] -= 1
        total += extend(x, len(nums) - 1)
        count[x] += 1
    return total
